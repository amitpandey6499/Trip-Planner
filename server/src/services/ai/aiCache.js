import { createHash } from 'node:crypto';
import { config } from '../../config/env.js';
import { AiCache, AiUsage } from '../../models/index.js';
import { todayIso } from '@tripplanner/shared';

/**
 * Cache key = everything that changes what Gemini would plan.
 * Exact dates are left out on purpose (only the month matters for season),
 * so the same trip a week later is still a cache hit; days are re-dated on the way out.
 */
export const cacheKey = (p, model) =>
  createHash('sha256')
    .update(
      JSON.stringify({
        v: 1,
        model,
        destination: p.destination.trim().toLowerCase(),
        month: p.startDate.slice(5, 7),
        durationDays: p.durationDays,
        travelersCount: p.travelersCount,
        budget: Math.round(p.totalBudget / 1000),
        budgetCategory: p.budgetCategory,
        interests: [...(p.interests ?? [])].sort(),
        travelStyle: p.travelStyle,
        accommodationType: p.accommodationType,
        dietaryPreference: p.dietaryPreference,
        specialNotes: (p.specialNotes ?? '').trim().toLowerCase(),
        language: p.language ?? 'en',
      }),
    )
    .digest('hex');

export const readCache = async (key) => {
  if (config.gemini.cacheDays === 0) return null;
  const entry = await AiCache.findOneAndUpdate({ key, expiresAt: { $gt: new Date() } }, { $inc: { hits: 1 } }, { returnDocument: 'after' }).lean();
  return entry?.itinerary ?? null;
};

export const writeCache = async (key, model, itinerary) => {
  if (config.gemini.cacheDays === 0) return;
  const expiresAt = new Date(Date.now() + config.gemini.cacheDays * 24 * 60 * 60 * 1000);
  await AiCache.findOneAndUpdate({ key }, { $set: { key, model, itinerary, expiresAt } }, { upsert: true });
};

/** Today's Gemini calls for a user → { used, limit, left }. */
export const getAiUsage = async (userId) => {
  const limit = config.gemini.dailyLimit;
  const doc = userId ? await AiUsage.findOne({ user: userId, day: todayIso() }).lean() : null;
  const used = Math.min(doc?.count ?? 0, limit);
  return { used, limit, left: limit - used };
};

/**
 * Count one Gemini call for today if the user is under the daily limit.
 * @returns {{ allowed: boolean, used: number, limit: number, left: number }}
 */
export const reserveAiCall = async (userId) => {
  const limit = config.gemini.dailyLimit;
  const day = todayIso();
  const doc = await AiUsage.findOneAndUpdate(
    { user: userId, day },
    { $setOnInsert: { user: userId, day }, $inc: { count: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  if (doc.count > limit) {
    await AiUsage.updateOne({ _id: doc._id }, { $inc: { count: -1 } });
    return { allowed: false, used: limit, limit, left: 0 };
  }
  return { allowed: true, used: doc.count, limit, left: limit - doc.count };
};
