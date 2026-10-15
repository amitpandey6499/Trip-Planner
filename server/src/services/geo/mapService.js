import { MAP_VERSION, countLocated, estimateRoute, haversineKm, mapStops, routeSignature } from '@tripplanner/shared';
import { config } from '../../config/env.js';
import { findOfflineDestination } from '../../data/offlineDestinations.js';
import { geocode, placeQuery } from './geocoder.js';
import { roadRoute } from './router.js';

/**
 * Part 8 — put an itinerary on the map:
 *   1. places   every activity / hotel / restaurant gets a trusted position + `locationSource`
 *               (curated data is kept; AI positions are checked with the geocoder)
 *   2. routes   every day gets a road route between its stops (or an honest estimate)
 *   3. map      summary { version, updatedAt, located, total, notice }
 *
 * It never throws because a map service is down: it falls back and says so in `map.notice`.
 * Already-done work (same stops → same route signature) is skipped, so running it again is cheap.
 */

// AI positions / lookups farther than this from the destination are wrong (or another place with the same name).
const MAX_KM_FROM_DESTINATION = 300;
// One update looks up at most this many places (≈ 1 per second); the rest are done on the next update.
const MAX_LOOKUPS_PER_RUN = 45;

const valid = (c) => c && Number.isFinite(c.lat) && Number.isFinite(c.lng) && Math.abs(c.lat) <= 90 && Math.abs(c.lng) <= 180;
const near = (c, center) => !center || haversineKm(c, center) <= MAX_KM_FROM_DESTINATION;

/** A known centre for the destination: curated data first, then one geocoder lookup. */
const destinationCenter = async (itinerary, { lookups, signal }) => {
  const curated = findOfflineDestination(itinerary.destination);
  if (curated) return { lat: curated.hubs[0].lat, lng: curated.hubs[0].lng };
  if (!lookups.enabled) return null;
  try {
    lookups.count += 1;
    const hit = await geocode(itinerary.destination, { signal });
    return hit.found ? { lat: hit.lat, lng: hit.lng } : null;
  } catch {
    lookups.enabled = false;
    lookups.failed = true;
    return null;
  }
};

/**
 * @param {object} itinerary  normalized itinerary (not modified; a copy is returned)
 * @param {{ force?: boolean, onProgress?: Function, signal?: AbortSignal }} options
 *   force: ask the routing service again for days that only have an estimate
 * @returns {Promise<{ itinerary, stats }>}
 */
export const enrichItinerary = async (itinerary, { force = false, onProgress = () => {}, signal } = {}) => {
  const it = structuredClone(itinerary);
  const curatedSource = it.source === 'offline' || it.source === 'sample';
  const lookups = { enabled: config.map.enabled, count: 0, failed: false };
  const stats = { geocoded: 0, keptAi: 0, curated: 0, unplaced: 0, pending: 0, routed: 0, estimated: 0, cachedLookups: 0, serviceDown: false };
  const notices = [];

  // ── 1. places ──────────────────────────────────────────────────────────
  const places = [
    ...it.days.flatMap((day) => day.activities.map((place) => ({ place, name: place.placeName, transit: place.category === 'Transit' }))),
    ...(it.hotels ?? []).map((place) => ({ place, name: place.name })),
    ...(it.restaurants ?? []).map((place) => ({ place, name: place.name })),
  ].filter(({ place }) => !place.locationSource);

  const center = places.length ? await destinationCenter(it, { lookups, signal }) : null;
  const answers = new Map(); // same query once per run ("Lunch at X" and restaurant "X")

  for (const [index, entry] of places.entries()) {
    if (signal?.aborted) break;
    const { place } = entry;
    const hasPosition = valid(place.coordinates);

    // Curated plans: their places come with a position. A place without one was added in the editor (Part 12): look it up.
    if (curatedSource && hasPosition) {
      place.locationSource = 'curated';
      stats.curated += 1;
      continue;
    }

    const query = entry.transit ? null : placeQuery(entry.name);
    let hit = null;
    if (query && lookups.enabled) {
      if (lookups.count >= MAX_LOOKUPS_PER_RUN) {
        stats.pending += 1; // left for the next update
        continue;
      }
      const fullQuery = `${query}, ${it.destination}`;
      try {
        if (!answers.has(fullQuery)) {
          lookups.count += 1;
          answers.set(fullQuery, await geocode(fullQuery, { center, signal }));
        }
        hit = answers.get(fullQuery);
        if (hit.cached) stats.cachedLookups += 1;
      } catch {
        // Service down: stop asking; places keep no locationSource so a later update tries again.
        lookups.enabled = false;
        lookups.failed = true;
        stats.pending += 1;
        continue;
      }
    } else if (query && lookups.failed) {
      stats.pending += 1; // the place finder went down earlier in this run
      continue;
    }

    if (hit?.found && near(hit, center)) {
      place.coordinates = { lat: hit.lat, lng: hit.lng };
      place.locationSource = 'geocoded';
      stats.geocoded += 1;
    } else if (hasPosition && near(place.coordinates, center)) {
      place.locationSource = 'ai'; // the AI's guess, nothing better found
      stats.keptAi += 1;
    } else {
      delete place.coordinates;
      place.locationSource = 'none';
      stats.unplaced += 1;
    }
    onProgress({ stage: 'places', done: index + 1, total: places.length, message: `Finding places on the map (${index + 1}/${places.length})` });
  }
  if (lookups.failed) stats.serviceDown = true;
  if (lookups.failed) notices.push('The place finder could not be reached, so some positions are the AI’s estimates. They will be checked again later.');
  if (stats.pending && !lookups.failed) notices.push('Some places will be located on the next map update.');

  // ── 2. routes ──────────────────────────────────────────────────────────
  let routerUp = config.map.enabled;
  const days = it.days.map((day) => ({ day, stops: mapStops(day) }));
  const todo = days.filter(({ day, stops }) => {
    const fresh = day.route && day.route.signature === routeSignature(stops);
    return !fresh || (force && day.route.provider === 'estimate');
  });
  for (const [i, { day, stops }] of todo.entries()) {
    if (signal?.aborted) break;
    onProgress({ stage: 'routes', done: i, total: todo.length, message: `Road route for Day ${day.dayNumber}` });
    if (!routerUp || stops.length < 2) {
      day.route = estimateRoute(stops);
    } else {
      try {
        const route = await roadRoute(stops, { signal });
        if (route.noRoad) notices.push(`No road route for Day ${day.dayNumber} (sea crossing?), so its distance is an estimate.`);
        delete route.noRoad;
        day.route = route;
      } catch {
        routerUp = false;
        stats.serviceDown = true;
        day.route = estimateRoute(stops);
        notices.push('The routing service could not be reached, so road distances are estimates. Try “Retry road routes” later.');
      }
    }
    stats[day.route.provider === 'osrm' ? 'routed' : 'estimated'] += day.route.provider === 'none' ? 0 : 1;
  }
  if (!config.map.enabled) notices.push('Map services are turned off on this server (MAP_ENABLED=false): distances are estimates.');

  // ── 3. summary ─────────────────────────────────────────────────────────
  it.map = {
    version: MAP_VERSION,
    updatedAt: new Date().toISOString(),
    ...countLocated(it),
    ...(notices.length && { notice: [...new Set(notices)].join(' ').slice(0, 300) }),
  };
  onProgress({ stage: 'done', done: 1, total: 1, message: 'Map ready' });
  return { itinerary: it, stats };
};
