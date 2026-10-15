import { config } from '../../config/env.js';
import { getJson, readGeoCache, writeGeoCache } from './geoHttp.js';

/**
 * Place lookup with Nominatim (OpenStreetMap). Policy: https://operations.osmfoundation.org/policies/nominatim/
 * Used only for itineraries written by the AI (its coordinates are guesses); curated places already
 * have positions. Results — including "not found" — are cached.
 */

const NOT_FOUND_CACHE_DAYS = 7; // try again after a week, the map data may have improved

const normalizeQuery = (text) => String(text ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

// "Lunch at Johnson's Cafe" → "Johnson's Cafe", "Visit Amber Fort (Amer)" → "Amber Fort"
const PREFIXES = [
  /^(early\s+)?(breakfast|brunch|lunch|dinner|snacks?|tea|coffee|drinks)\s*(at|in|:|-|–)\s*/i,
  /^(visit|explore|discover|see|tour|check[- ]?in at|stay at|relax at|evening at|morning at|sunset at|sunrise at|shopping at|shop at|walk (around|to|through)|stroll (around|through)|trek to|hike to|drive to|ride to|boat ride (at|on|in)|cruise (on|at)|dip (at|in))\s+/i,
  /^(the)\s+/i,
];
// Not a findable place: "Check out & depart", "Free time around Mall Road", "Travel to Alleppey", "Lunch"
const GENERIC_ANYWHERE = /\b(check[- ]?(in|out)|free time|local travel|depart(ure)?|arriv(e|al|ing)|transfer to|travel to|drive back|back to (the )?hotel|return to (the )?hotel|at (the|your) hotel|on the way|en route)\b/i;
const GENERIC_WHOLE = /^(rest|relax|leisure|shopping|sightseeing|street food|night market|lunch|dinner|breakfast|travel|hotel|resort)$/i;
// "Local thali", "A cafe near the ghats"
const GENERIC_START = /^(local|nearby|any|a |some )/i;

/** The searchable part of an activity / hotel / restaurant name, or null when it is not a real place. */
export const placeQuery = (name) => {
  let text = String(name ?? '').trim();
  for (const prefix of PREFIXES) text = text.replace(prefix, '');
  text = text
    .replace(/\(.*?\)/g, ' ') // remove "(Amer)"
    .split(/\s+(?:&|and|\+|→|->|–|—)\s+/)[0] // "Hadimba Temple & Mall Road" → first place
    .replace(/[,;:.!]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length < 3 || GENERIC_ANYWHERE.test(name) || GENERIC_WHOLE.test(text) || GENERIC_START.test(text)) return null;
  return text;
};

/**
 * @param {string} query   e.g. "Amber Fort, Jaipur"
 * @param {{ center?: {lat,lng}, signal?: AbortSignal }} options  center biases results towards the destination
 * @returns {Promise<{ found: boolean, lat?: number, lng?: number, name?: string }>}  (throws GeoServiceError when the service fails)
 */
export const geocode = async (query, { center, signal } = {}) => {
  const near = center ? `${center.lat.toFixed(1)},${center.lng.toFixed(1)}` : 'in';
  const key = `place:v1:${near}:${normalizeQuery(query)}`;
  const cached = await readGeoCache(key);
  if (cached) return { ...cached, cached: true };

  const params = new URLSearchParams({ q: query, format: 'jsonv2', limit: '1', countrycodes: 'in', 'accept-language': 'en' });
  if (center) {
    // prefer (not force) results around the destination: ±1.5° box
    const d = 1.5;
    params.set('viewbox', [center.lng - d, center.lat + d, center.lng + d, center.lat - d].map((n) => n.toFixed(4)).join(','));
    params.set('bounded', '0');
  }
  if (config.map.nominatimEmail) params.set('email', config.map.nominatimEmail);

  const results = await getJson('nominatim', `${config.map.nominatimUrl}/search?${params}`, { signal });
  const hit = Array.isArray(results) ? results[0] : null;
  const lat = Number(hit?.lat);
  const lng = Number(hit?.lon);
  const data =
    hit && Number.isFinite(lat) && Number.isFinite(lng)
      ? { found: true, lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5, name: String(hit.display_name ?? '').slice(0, 200) }
      : { found: false };
  await writeGeoCache(key, 'place', data, data.found ? undefined : NOT_FOUND_CACHE_DAYS);
  return data;
};
