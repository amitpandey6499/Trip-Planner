import { DaySchema, addDays, isValidIsoDate, normalizeItinerary } from '@tripplanner/shared';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { cacheKey, getAiUsage, readCache, reserveAiCall, writeCache } from './ai/aiCache.js';
import { createDayExtractor } from './ai/dayStream.js';
import { AiResponseError, describeGeminiError, getGeminiClient } from './ai/geminiClient.js';
import { OfflineUnsupportedError, destinationImageFor, planOffline, replanOfflineDay } from './ai/offlinePlanner.js';
import { DAY_SCHEMA, SYSTEM_INSTRUCTION, buildDayPrompt, buildPrompt, itineraryJsonSchema } from './ai/prompt.js';

/**
 * Itinerary generation — the order of attempts:
 *
 *   1. Cache        same request answered before → instant, free
 *   2. Gemini       if a key is set and the user is under the daily limit;
 *                   the answer must pass normalizeItinerary (shared contract),
 *                   otherwise we retry ONCE telling Gemini what was wrong
 *   3. Offline      curated-places planner (8 destinations), with a notice explaining why
 *   4. Error        clear message: what to do next
 *
 * Part 9 hooks (all optional): onProgress({ stage, message, percent }), onDay({ index, total, day }),
 * onReset() (a retry starts: forget the preview days), signal (the user cancelled).
 *
 * @returns {{ itinerary, meta: { source, cached, notice?, ai: { used, limit, left } } }}
 */

const destinationImageFallback =
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80';

const noop = () => {};

export class CancelledError extends Error {
  constructor() {
    super('Cancelled.');
    this.name = 'CancelledError';
  }
}
const stopIfCancelled = (signal) => {
  if (signal?.aborted) throw new CancelledError();
};

/** A day from the unfinished answer, checked just enough to show it as a preview. */
const previewDay = (raw, index, prefs) => {
  const parsed = DaySchema.safeParse({
    ...raw,
    dayNumber: index + 1,
    date: isValidIsoDate(prefs.startDate) ? addDays(prefs.startDate, index) : undefined,
  });
  return parsed.success ? parsed.data : null;
};

const askGemini = async (client, prefs, { onProgress, onDay, onReset, signal }) => {
  const schema = itineraryJsonSchema(prefs.durationDays);
  const prompt = buildPrompt(prefs);
  const streaming = onDay !== noop && typeof client.generateJsonStream === 'function';
  let lastError;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    stopIfCancelled(signal);
    const message =
      attempt === 1
        ? prompt
        : `${prompt}\n\nYour previous answer was rejected because: ${lastError.message}. Return a corrected, complete JSON answer.`;
    if (attempt === 2) {
      onReset();
      onProgress({ stage: 'retry', message: 'The first answer had a problem — asking Gemini again...', percent: 10 });
    }
    try {
      let raw;
      if (streaming) {
        const extract = createDayExtractor((day, index) => {
          const preview = previewDay(day, index, prefs);
          if (!preview) return;
          onDay({ index, total: prefs.durationDays, day: preview });
          onProgress({
            stage: 'writing',
            message: `Day ${index + 1} of ${prefs.durationDays} is ready...`,
            percent: Math.min(90, 10 + Math.round(((index + 1) / prefs.durationDays) * 80)),
          });
        });
        raw = await client.generateJsonStream({ system: SYSTEM_INSTRUCTION, prompt: message, schema, signal, onText: extract });
      } else {
        raw = await client.generateJson({ system: SYSTEM_INSTRUCTION, prompt: message, schema, signal });
      }
      onProgress({ stage: 'checking', message: 'Checking the plan and adding up the budget...', percent: 95 });
      return normalizeItinerary(
        {
          ...raw,
          source: 'gemini',
          model: client.model ?? config.gemini.model,
          generatedAt: new Date().toISOString(),
          destination: prefs.destination,
          destinationImage: destinationImageFor(prefs.destination) ?? destinationImageFallback,
        },
        prefs,
        { expectDays: prefs.durationDays },
      );
    } catch (err) {
      if (signal?.aborted) throw new CancelledError();
      lastError = err;
      const status = Number(err?.status);
      // Only answers that were wrong (or a temporary server error) are worth one more try.
      const retryable = err?.name === 'ItineraryError' || err?.name === 'AiResponseError' || status >= 500;
      if (!retryable) break;
      if (!config.isTest) console.warn(`[AI] Attempt ${attempt} rejected: ${err.message}`);
    }
  }
  throw lastError;
};

const offlineOrThrow = (prefs, { reason, status }) => {
  try {
    return normalizeItinerary(planOffline(prefs), prefs, { expectDays: prefs.durationDays });
  } catch (err) {
    if (!(err instanceof OfflineUnsupportedError)) throw err;
    const supported = err.supported.join(', ');
    if (status === 422) {
      throw new ApiError(
        422,
        `AI planning is not set up yet, and the offline planner only knows these places: ${supported}. Choose one of them, or add a Gemini API key.`,
        { field: 'destination', supported: err.supported },
      );
    }
    throw new ApiError(status, `${reason}. The offline planner only covers: ${supported}. Please try again in a little while.`, {
      supported: err.supported,
    });
  }
};

/** Offline plan + its days as "ready" events (instant: the planner needs no network). */
const offlinePlan = (prefs, { reason, status, onProgress, onDay }) => {
  onProgress({ stage: 'offline', message: 'Planning with curated places (offline planner)...', percent: 30 });
  const itinerary = offlineOrThrow(prefs, { reason, status });
  itinerary.days.forEach((day, index) => onDay({ index, total: itinerary.days.length, day }));
  return itinerary;
};

export const generateItinerary = async (
  prefs,
  { userId = null, fresh = false, onProgress = noop, onDay = noop, onReset = noop, signal } = {},
) => {
  const client = getGeminiClient();
  const hooks = { onProgress, onDay, onReset, signal };

  // Not configured → offline planner (or a clear 422).
  if (!client) {
    if (!config.isTest) console.log(`[AI] No Gemini key: offline planner for ${prefs.destination}.`);
    const itinerary = offlinePlan(prefs, { status: 422, ...hooks });
    return { itinerary, meta: { source: 'offline', cached: false, notice: null, ai: null } };
  }

  const model = client.model ?? config.gemini.model;
  const key = cacheKey(prefs, model);

  // 1. Cache
  if (!fresh) {
    onProgress({ stage: 'cache', message: 'Looking for a plan made earlier for the same trip...', percent: 5 });
    const cached = await readCache(key);
    if (cached) {
      try {
        const itinerary = normalizeItinerary(cached, prefs, { expectDays: prefs.durationDays });
        return { itinerary, meta: { source: 'gemini', cached: true, notice: null, ai: await getAiUsage(userId) } };
      } catch {
        // stale / incompatible cache entry → ignore and ask again
      }
    }
  }
  stopIfCancelled(signal);

  // 2. Gemini (within the daily limit)
  const usage = userId ? await reserveAiCall(userId) : { allowed: true, ...(await getAiUsage(null)) };
  if (!usage.allowed) {
    const reason = `You have used all ${usage.limit} AI plans for today`;
    const itinerary = offlinePlan(prefs, { reason, status: 429, ...hooks });
    return {
      itinerary,
      meta: { source: 'offline', cached: false, notice: `${reason}, so this plan was made by the offline planner.`, ai: usage },
    };
  }

  try {
    console.log(`[AI] Asking ${model} for ${prefs.durationDays} days in ${prefs.destination}...`);
    onProgress({ stage: 'ai', message: `Asking Gemini (${model}) to plan ${prefs.durationDays} days in ${prefs.destination}...`, percent: 10 });
    const itinerary = await askGemini(client, prefs, hooks);
    await writeCache(key, model, itinerary).catch((err) => console.warn('[AI] Could not cache the answer:', err.message));
    return { itinerary, meta: { source: 'gemini', cached: false, notice: null, ai: usage } };
  } catch (err) {
    if (err instanceof CancelledError) throw err;
    const reason = describeGeminiError(err, model);
    console.warn(`[AI] Gemini failed (${reason}): ${err.message}`);
    const pretty = reason.charAt(0).toUpperCase() + reason.slice(1);
    // 3. Offline fallback
    onReset();
    const itinerary = offlinePlan(prefs, { reason: pretty, status: 503, ...hooks });
    return {
      itinerary,
      meta: { source: 'offline', cached: false, notice: `${pretty}, so this plan was made by the offline planner.`, ai: usage },
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Part 9 — regenerate ONE day
// ─────────────────────────────────────────────────────────────────────────────

/** Put a new day into the trip; everything else (other days, their routes, stays) stays the same. */
const withNewDay = (itinerary, prefs, dayNumber, rawDay) => {
  const days = itinerary.days.map((day) => (day.dayNumber === dayNumber ? { ...rawDay, id: day.id } : day));
  return normalizeItinerary({ ...itinerary, days }, prefs, { expectDays: prefs.durationDays });
};

const offlineDay = (prefs, itinerary, dayNumber, { pace, reason, status }) => {
  try {
    const { day, notice } = replanOfflineDay(prefs, itinerary, dayNumber, { pace });
    return { itinerary: withNewDay(itinerary, prefs, dayNumber, day), notice };
  } catch (err) {
    if (!(err instanceof OfflineUnsupportedError)) throw err;
    if (status === 422) {
      throw new ApiError(422, `AI planning is not set up yet, and the offline planner does not know ${prefs.destination}. Add a Gemini API key to change single days here.`);
    }
    throw new ApiError(status, `${reason}. Please try again in a little while.`);
  }
};

/**
 * @param {object} prefs      validated TripPreferences of the trip
 * @param {object} rawItinerary the current itinerary (from the client)
 * @param {number} dayNumber
 * @param {{ pace?: string, note?: string, userId?: string }} options
 * @returns {{ itinerary, meta: { source, notice, ai, dayNumber } }}
 */
export const regenerateDay = async (prefs, rawItinerary, dayNumber, { pace, note, userId = null } = {}) => {
  let itinerary;
  try {
    itinerary = normalizeItinerary(rawItinerary, prefs, { expectDays: prefs.durationDays });
  } catch (err) {
    throw ApiError.badRequest(`This itinerary does not match the trip: ${err.message} Use Regenerate for the whole trip instead.`, { field: 'itinerary' });
  }

  const client = getGeminiClient();
  if (!client) {
    const result = offlineDay(prefs, itinerary, dayNumber, { pace, status: 422 });
    const notice = [note ? 'Notes need AI (no Gemini key), so the offline planner picked different places instead.' : null, result.notice]
      .filter(Boolean)
      .join(' ');
    return { itinerary: result.itinerary, meta: { source: 'offline', notice: notice || null, ai: null, dayNumber } };
  }

  const usage = userId ? await reserveAiCall(userId) : { allowed: true, ...(await getAiUsage(null)) };
  if (!usage.allowed) {
    const reason = `You have used all ${usage.limit} AI plans for today`;
    const result = offlineDay(prefs, itinerary, dayNumber, { pace, reason, status: 429 });
    return {
      itinerary: result.itinerary,
      meta: { source: 'offline', notice: [`${reason}, so the offline planner made this day.`, result.notice].filter(Boolean).join(' '), ai: usage, dayNumber },
    };
  }

  const prompt = buildDayPrompt(prefs, itinerary, dayNumber, { pace, note });
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const message = attempt === 1 ? prompt : `${prompt}\n\nYour previous answer was rejected because: ${lastError.message}. Return a corrected JSON day.`;
      const raw = await client.generateJson({ system: SYSTEM_INSTRUCTION, prompt: message, schema: DAY_SCHEMA });
      if (!raw || !Array.isArray(raw.activities)) throw new AiResponseError('The answer has no activities.');
      return { itinerary: withNewDay(itinerary, prefs, dayNumber, raw), meta: { source: 'gemini', notice: null, ai: usage, dayNumber } };
    } catch (err) {
      lastError = err;
      const retryable = err?.name === 'ItineraryError' || err?.name === 'AiResponseError' || Number(err?.status) >= 500;
      if (!retryable) break;
    }
  }

  const reason = describeGeminiError(lastError, client.model ?? config.gemini.model);
  const pretty = reason.charAt(0).toUpperCase() + reason.slice(1);
  console.warn(`[AI] Day ${dayNumber} regenerate failed (${reason}): ${lastError?.message}`);
  const result = offlineDay(prefs, itinerary, dayNumber, { pace, reason: pretty, status: 503 });
  return {
    itinerary: result.itinerary,
    meta: { source: 'offline', notice: [`${pretty}, so the offline planner made this day.`, result.notice].filter(Boolean).join(' '), ai: usage, dayNumber },
  };
};

export { getAiUsage };

/** True when itineraries can come from Gemini (key set, or a test client injected). */
export const aiEnabled = () => Boolean(getGeminiClient());
