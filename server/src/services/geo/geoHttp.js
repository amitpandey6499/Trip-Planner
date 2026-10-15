import { projectInfo } from '@tripplanner/shared';
import { config } from '../../config/env.js';
import { GeoCache } from '../../models/index.js';

/**
 * HTTP + caching shared by the geocoder (Nominatim) and the router (OSRM).
 *
 * Usage-policy rules built in here (OpenStreetMap community services):
 *   - at most ONE request per second per service, for the whole server (a queue, not per user)
 *   - a User-Agent that names this app (library default agents are blocked)
 *   - every answer is cached in MongoDB (GeoCache) so nothing is asked twice
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
let minIntervalMs = 1100; // a little over 1 second, to stay safely under "1 request per second"

/** Tests only: fake fetch (or null for the real one) and the gap between requests. */
export const setGeoFetch = (fn) => {
  fetchImpl = fn ?? ((...args) => globalThis.fetch(...args));
};
export const setGeoInterval = (ms) => {
  minIntervalMs = ms;
};

/** A one-at-a-time queue that keeps `minIntervalMs` between the START of two requests. */
const createThrottle = () => {
  let chain = Promise.resolve();
  let lastStart = 0;
  return (task) => {
    const run = chain.then(async () => {
      const wait = lastStart + minIntervalMs - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      lastStart = Date.now();
      return task();
    });
    chain = run.catch(() => {}); // one failure must not block the queue
    return run;
  };
};

const throttles = { nominatim: createThrottle(), osrm: createThrottle() };

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
