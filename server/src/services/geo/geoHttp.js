import { projectInfo } from '@tripplanner/shared';
import { config } from '../../config/env.js';
import { GeoCache } from '../../models/index.js';

/**
 * HTTP + caching for every free outside service:
 *   nominatim (places, Part 8), osrm (road routes, Part 8), wikipedia (photos, Part 10), openmeteo (weather, Part 11).
 *
 * Usage-policy rules built in here:
 *   - one queue per service with a minimum gap between requests (OpenStreetMap services: max 1 per second)
 *   - a User-Agent that names this app (library default agents are blocked)
 *   - answers are cached in MongoDB (GeoCache) so nothing is asked twice
 */

export class GeoServiceError extends Error {
  constructor(message, { status, service } = {}) {
    super(message);
    this.name = 'GeoServiceError';
    this.status = status;
    this.service = service;
  }
}

export const USER_AGENT =
  config.map.userAgent || `TripPlanner/${projectInfo.version} (B.Tech mini project, ${projectInfo.college.shortName}; trip planner)`;

// ── tests can swap the network and the waiting ─────────────────────────────
let fetchImpl = (...args) => globalThis.fetch(...args);
// Minimum gap between two requests to the same service (ms).
const INTERVALS = {
  nominatim: 1100, // policy: max 1 request per second
  osrm: 1100, // policy: max 1 request per second
  wikipedia: 250,
  openmeteo: 150, // free tier: 600 calls per minute
};
let intervalOverride = null;

/** Tests only: fake fetch (or null for the real one) and the gap between requests. */
export const setGeoFetch = (fn) => {
  fetchImpl = fn ?? ((...args) => globalThis.fetch(...args));
};
export const setGeoInterval = (ms) => {
  intervalOverride = ms;
};
const gapFor = (service) => intervalOverride ?? INTERVALS[service] ?? 1000;

/** A one-at-a-time queue that keeps a minimum gap between the START of two requests. */
const createThrottle = (service) => {
  let chain = Promise.resolve();
  let lastStart = 0;
  return (task) => {
    const run = chain.then(async () => {
      const wait = lastStart + gapFor(service) - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      lastStart = Date.now();
      return task();
    });
    chain = run.catch(() => {}); // one failure must not block the queue
    return run;
  };
};

const throttles = Object.fromEntries(Object.keys(INTERVALS).map((service) => [service, createThrottle(service)]));

/** GET JSON from a map service (queued, with timeout and our User-Agent). */
export const getJson = (service, url, { signal } = {}) =>
  throttles[service](async () => {
    if (signal?.aborted) throw new GeoServiceError('Cancelled.', { service });
    const timeout = AbortSignal.timeout(config.map.timeoutMs);
    let res;
    try {
      res = await fetchImpl(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', 'Accept-Language': 'en' },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
    } catch (err) {
      const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
      throw new GeoServiceError(timedOut ? `${service} did not answer in time` : `${service} could not be reached`, { service });
    }
    // OSRM answers 400 with { code: 'NoRoute' | 'InvalidQuery' ... } — the caller wants to read that.
    const body = await res.json().catch(() => null);
    if (!res.ok && !(service === 'osrm' && body?.code)) {
      throw new GeoServiceError(`${service} answered HTTP ${res.status}`, { status: res.status, service });
    }
    return body;
  });

// ── cache ───────────────────────────────────────────────────────────────────
export const readGeoCache = async (key) => {
  const entry = await GeoCache.findOne({ key, expiresAt: { $gt: new Date() } }).lean();
  return entry?.data ?? null;
};

export const writeGeoCache = async (key, kind, data, days = config.map.cacheDays) => {
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await GeoCache.findOneAndUpdate({ key }, { $set: { key, kind, data, expiresAt } }, { upsert: true }).catch((err) =>
    console.warn('[Map] Could not cache:', err.message),
  );
};
