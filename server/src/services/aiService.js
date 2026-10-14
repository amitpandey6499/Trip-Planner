import { normalizeItinerary } from '@tripplanner/shared';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { cacheKey, getAiUsage, readCache, reserveAiCall, writeCache } from './ai/aiCache.js';
import { describeGeminiError, getGeminiClient } from './ai/geminiClient.js';
import { OfflineUnsupportedError, destinationImageFor, planOffline } from './ai/offlinePlanner.js';
import { SYSTEM_INSTRUCTION, buildPrompt, itineraryJsonSchema } from './ai/prompt.js';

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
 * @returns {{ itinerary, meta: { source, cached, notice?, ai: { used, limit, left } } }}
 */

const destinationImageFallback =
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80';

const askGemini = async (client, prefs) => {
  const schema = itineraryJsonSchema(prefs.durationDays);
  const prompt = buildPrompt(prefs);
  let lastError;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const message =
      attempt === 1
        ? prompt
        : `${prompt}\n\nYour previous answer was rejected because: ${lastError.message}. Return a corrected, complete JSON answer.`;
    try {
      const raw = await client.generateJson({ system: SYSTEM_INSTRUCTION, prompt: message, schema });
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

export const generateItinerary = async (prefs, { userId = null, fresh = false } = {}) => {
  const client = getGeminiClient();

  // Not configured → offline planner (or a clear 422).
  if (!client) {
    if (!config.isTest) console.log(`[AI] No Gemini key: offline planner for ${prefs.destination}.`);
    const itinerary = offlineOrThrow(prefs, { status: 422 });
    return { itinerary, meta: { source: 'offline', cached: false, notice: null, ai: null } };
  }

  const model = client.model ?? config.gemini.model;
  const key = cacheKey(prefs, model);

  // 1. Cache
  if (!fresh) {
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

  // 2. Gemini (within the daily limit)
  const usage = userId ? await reserveAiCall(userId) : { allowed: true, ...(await getAiUsage(null)) };
  if (!usage.allowed) {
    const reason = `You have used all ${usage.limit} AI plans for today`;
    const itinerary = offlineOrThrow(prefs, { reason, status: 429 });
    return {
      itinerary,
      meta: { source: 'offline', cached: false, notice: `${reason}, so this plan was made by the offline planner.`, ai: usage },
    };
  }

  try {
    console.log(`[AI] Asking ${model} for ${prefs.durationDays} days in ${prefs.destination}...`);
    const itinerary = await askGemini(client, prefs);
    await writeCache(key, model, itinerary).catch((err) => console.warn('[AI] Could not cache the answer:', err.message));
    return { itinerary, meta: { source: 'gemini', cached: false, notice: null, ai: usage } };
  } catch (err) {
    const reason = describeGeminiError(err, model);
    console.warn(`[AI] Gemini failed (${reason}): ${err.message}`);
    const pretty = reason.charAt(0).toUpperCase() + reason.slice(1);
    // 3. Offline fallback
    const itinerary = offlineOrThrow(prefs, { reason: pretty, status: 503 });
    return {
      itinerary,
      meta: { source: 'offline', cached: false, notice: `${pretty}, so this plan was made by the offline planner.`, ai: usage },
    };
  }
};

export { getAiUsage };

/** True when itineraries can come from Gemini (key set, or a test client injected). */
export const aiEnabled = () => Boolean(getGeminiClient());
