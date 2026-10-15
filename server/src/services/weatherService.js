import { addDays, findOfflinePlannerDestination, todayIso, weatherInfo, weatherSeverity } from '@tripplanner/shared';
import { config } from '../config/env.js';
import { findOfflineDestination } from '../data/offlineDestinations.js';
import { ApiError } from '../utils/ApiError.js';
import { findDestinationDoc } from './destinationService.js';
import { geocode } from './geo/geocoder.js';
import { getJson, readGeoCache, writeGeoCache } from './geo/geoHttp.js';

/**
 * Part 11 — weather for the days of a trip, from Open-Meteo (free, no key, CC BY 4.0, non-commercial use).
 *   - next 16 days      → real FORECAST (min/max, rain chance)
 *   - further ahead      → TYPICAL weather for those dates: average of the same dates in the last 3 years
 *   - dates already past → what the weather ACTUALLY was
 * Everything is cached (forecast for 3 hours, history for months).
 */

const FORECAST_DAYS = 16;
const TYPICAL_YEARS = 3;
const ARCHIVE_DELAY_DAYS = 30; // recent days come from the forecast API (archive data arrives later)
const TZ = 'Asia/Kolkata';
export const WEATHER_ATTRIBUTION = { text: 'Weather data by Open-Meteo.com', url: 'https://open-meteo.com/', license: 'CC BY 4.0' };

const datesBetween = (start, end) => {
  const out = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
};
const minusYears = (iso, years) => {
  const [y, m, d] = iso.split('-');
  const day = m === '02' && d === '29' ? '28' : d;
  return `${Number(y) - years}-${m}-${day}`;
};
const round1 = (n) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : null);

/** Where to get the weather for: given position, catalog, offline data, or the geocoder. */
const resolvePlace = async ({ destination, lat, lng }) => {
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { name: destination, lat, lng, source: 'given' };
  const doc = await findDestinationDoc(destination);
  if (doc?.center) return { name: doc.name, lat: doc.center.lat, lng: doc.center.lng, source: 'catalog' };
  const offline = findOfflineDestination(findOfflinePlannerDestination(destination)?.name ?? '');
  if (offline) return { name: offline.name, lat: offline.hubs[0].lat, lng: offline.hubs[0].lng, source: 'catalog' };
  if (config.map.enabled) {
    try {
      const hit = await geocode(destination);
      if (hit.found) return { name: destination, lat: hit.lat, lng: hit.lng, source: 'geocoded' };
    } catch {
      // fall through to the 404 below
    }
  }
  throw ApiError.notFound(`We could not find "${destination}" on the map, so there is no weather for it.`, { field: 'destination' });
};

const daily = async (kind, base, { lat, lng, start, end, extra = '' }, cacheDays) => {
  const key = `weather:${kind}:v1:${lat.toFixed(2)},${lng.toFixed(2)}:${start}:${end}`;
  const cached = await readGeoCache(key);
  if (cached) return cached;
  const fields = `weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum${extra}`;
  const url = `${base}/v1/${kind === 'archive' ? 'archive' : 'forecast'}?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&daily=${fields}&timezone=${encodeURIComponent(TZ)}&start_date=${start}&end_date=${end}`;
  let body;
  try {
    body = await getJson('openmeteo', url);
  } catch {
    throw new ApiError(503, 'The weather service could not be reached. Please try again in a little while.');
  }
  const d = body?.daily;
  if (!d || !Array.isArray(d.time)) throw new ApiError(503, `The weather service did not answer as expected${body?.reason ? `: ${body.reason}` : ''}.`);
  const rows = d.time.map((date, i) => ({
    date,
    code: d.weather_code?.[i] ?? null,
    tMax: round1(d.temperature_2m_max?.[i]),
    tMin: round1(d.temperature_2m_min?.[i]),
    rainMm: round1(d.precipitation_sum?.[i] ?? 0),
    ...(d.precipitation_probability_max && { rainChance: d.precipitation_probability_max[i] ?? null }),
  }));
  await writeGeoCache(key, 'weather', rows, cacheDays);
  return rows;
};

const describe = (row, kind, extra = {}) => ({ ...row, kind, ...weatherInfo(row.code), ...extra });

/** Same dates in each of the last 3 years → one "typical" day per date. */
const typicalDays = async (place, dates) => {
  // the most recent years in which these dates are already history (archive data)
  let first = 1;
  while (minusYears(dates.at(-1), first) >= addDays(todayIso(), -7)) first += 1;
  const yearsBack = Array.from({ length: TYPICAL_YEARS }, (_, i) => first + i);
  const perYear = [];
  for (const back of yearsBack) {
    const rows = await daily('archive', config.weather.archiveUrl, { ...place, start: minusYears(dates[0], back), end: minusYears(dates.at(-1), back) }, 180);
    perYear.push(rows);
  }
  return dates.map((date, i) => {
    const samples = perYear.map((rows) => rows[i]).filter((r) => r && Number.isFinite(r.tMax));
    if (!samples.length) return { date, kind: 'typical', code: null, tMax: null, tMin: null, rainMm: null, ...weatherInfo(null) };
    const avg = (key) => round1(samples.reduce((sum, r) => sum + (r[key] ?? 0), 0) / samples.length);
    // most frequent code; the worse weather wins a tie
    const counts = new Map();
    samples.forEach((r) => counts.set(r.code, (counts.get(r.code) ?? 0) + 1));
    const code = [...counts.entries()].sort((a, b) => b[1] - a[1] || weatherSeverity(b[0]) - weatherSeverity(a[0]))[0][0];
    const rainyYears = samples.filter((r) => (r.rainMm ?? 0) >= 1).length;
    return describe({ date, code, tMax: avg('tMax'), tMin: avg('tMin'), rainMm: avg('rainMm') }, 'typical', {
      rainyYears,
      years: samples.length,
      rainChance: Math.round((rainyYears / samples.length) * 100),
    });
  });
};

/**
 * @returns {{ location: { name, lat, lng, source }, days: object[], attribution, notes: string[] }}
 */
export const getTripWeather = async ({ destination, start, end, lat, lng }) => {
  if (!config.weather.enabled) throw new ApiError(503, 'Weather is turned off on this server (WEATHER_ENABLED=false).');
  const place = await resolvePlace({ destination, lat, lng });
  const today = todayIso();
  const lastForecast = addDays(today, FORECAST_DAYS - 1);
  const firstRecent = addDays(today, -ARCHIVE_DELAY_DAYS);
  const dates = datesBetween(start, end);

  const past = dates.filter((d) => d < firstRecent);
  const forecast = dates.filter((d) => d >= firstRecent && d <= lastForecast);
  const later = dates.filter((d) => d > lastForecast);
  const byDate = new Map();

  if (forecast.length) {
    const rows = await daily('forecast', config.weather.forecastUrl, { ...place, start: forecast[0], end: forecast.at(-1), extra: ',precipitation_probability_max' }, 0.125);
    rows.forEach((r) => byDate.set(r.date, describe(r, r.date < today ? 'actual' : 'forecast')));
  }
  if (past.length) {
    const rows = await daily('archive', config.weather.archiveUrl, { ...place, start: past[0], end: past.at(-1) }, 365);
    rows.forEach((r) => byDate.set(r.date, describe(r, 'actual')));
  }
  if (later.length) (await typicalDays(place, later)).forEach((r) => byDate.set(r.date, r));

  const notes = [];
  if (later.length) notes.push(`Days more than ${FORECAST_DAYS} days away show typical weather for those dates (average of the last ${TYPICAL_YEARS} years), not a forecast. Check again closer to the trip.`);
  if (forecast.some((d) => d >= today)) notes.push('Forecasts change: they are refreshed every few hours.');
  return {
    location: place,
    days: dates.map((date) => byDate.get(date) ?? { date, kind: 'missing', ...weatherInfo(null) }),
    attribution: WEATHER_ATTRIBUTION,
    notes,
  };
};
