import {
  IRCTC_SEARCH_URL,
  findOriginCity,
  googleFlightsUrl,
  haversineKm,
  mapsDirectionsUrl,
  redBusUrl,
  roundKm,
} from '@tripplanner/shared';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { getDestination } from './destinationService.js';
import { geocode } from './geo/geocoder.js';
import { roadRoute } from './geo/router.js';

/**
 * Part 11 — "How to reach": flight / train / bus / car from the traveller's city, with honest time estimates
 * and links that open the search on the site that sells the ticket (Google Flights, IRCTC, redBus, Google Maps).
 * Nothing is booked here and no fares are invented.
 */

const ROAD_FACTOR = 1.3; // straight line → road, when the routing service is not used
const RAIL_FACTOR = 1.25;
// Average door-to-door speeds (km/h) incl. stops — e.g. Delhi → Manali (≈540 km) is a 12–14 h bus ride.
const SPEED = { car: 55, carHills: 45, bus: 45, busHills: 40, train: 55, taxi: 35, flight: 650 };
const LONG_GROUND_TRIP_MIN = 14 * 60; // longer than this by road / rail → flying is the better fit (if possible)
const AIRPORT_TIME_MIN = 150; // check-in, security, boarding, baggage

const minutes = (hours) => Math.round(hours * 60);

/** The traveller's city: our list first (has airport / station), else the geocoder (position only). */
const resolveOrigin = async (from) => {
  const known = findOriginCity(from);
  if (known) return { ...known, known: true };
  if (config.map.enabled) {
    try {
      const hit = await geocode(`${from}, India`);
      if (hit.found) return { name: from.trim(), lat: hit.lat, lng: hit.lng, airport: null, station: null, known: false };
    } catch {
      // fall through
    }
  }
  throw ApiError.notFound(`We could not find "${from}". Pick a city from the list (Delhi, Mumbai, Bengaluru...).`, { field: 'from' });
};

/** Road distance: the real road route (OSRM, cached) when map services are on, else an estimate. */
const roadDistance = async (origin, center) => {
  const straight = haversineKm(origin, center);
  if (config.map.enabled) {
    try {
      const route = await roadRoute([
        { id: 'from', coordinates: { lat: origin.lat, lng: origin.lng } },
        { id: 'to', coordinates: center },
      ]);
      if (route.provider === 'osrm') return { km: route.distanceKm, durationMin: route.durationMin, source: 'osrm' };
      if (route.noRoad) return null; // no road at all (islands)
    } catch {
      // routing service down → estimate
    }
  }
  return { km: roundKm(straight * ROAD_FACTOR), durationMin: null, source: 'estimate' };
};

/**
 * @param {{ from: string, to: string, date?: string, travelers?: number }} query
 */
export const getReachOptions = async ({ from, to, date }) => {
  const origin = await resolveOrigin(from);
  const dest = await getDestination(to);
  if (!dest) throw ApiError.notFound(`We do not have travel details for "${to}" yet.`, { field: 'to' });

  const straightKm = roundKm(haversineKm(origin, dest.center));
  const reach = dest.reach ?? {};
  const hills = (dest.terrain ?? []).some((t) => ['mountain', 'hill', 'high-altitude'].includes(t));
  const island = (dest.terrain ?? []).includes('island') || (!reach.railway && !reach.road && reach.sea);
  const base = { from: { name: origin.name, state: origin.state ?? null, airport: origin.airport, station: origin.station, known: origin.known }, to: { slug: dest.slug, name: dest.name, state: dest.state } };

  if (straightKm < 30) {
    return { ...base, straightKm, road: null, options: [{ mode: 'local', title: `You are already in ${dest.name}`, durationMin: 0, steps: ['Use local taxis, autos or buses.'], links: [] }], notes: dest.notes };
  }

  const road = island ? null : await roadDistance(origin, dest.center);
  const carMin = road ? (road.source === 'osrm' && !hills ? road.durationMin : minutes(road.km / (hills ? SPEED.carHills : SPEED.car))) : null;
  const options = [];

  // ✈️ Flight
  if (reach.airport && origin.airport && origin.airport !== reach.airport.code && straightKm > 300) {
    const lastMile = reach.airport.km > 3 ? minutes(reach.airport.km / SPEED.taxi) : 10;
    options.push({
      mode: 'flight',
      title: `Fly ${origin.airport} → ${reach.airport.code}`,
      durationMin: minutes(straightKm / SPEED.flight) + AIRPORT_TIME_MIN + lastMile,
      steps: [
        `Fly from ${origin.name} (${origin.airport}) to ${reach.airport.name} (${reach.airport.code}).`,
        reach.airport.km > 3 ? `About ${reach.airport.km} km by taxi to ${dest.name}.` : `The airport is in ${dest.name}.`,
      ],
      links: [{ label: 'Search flights (Google Flights)', url: googleFlightsUrl({ from: origin.airport, to: reach.airport.code, date }) }],
      note: ['Not every route has direct flights; connections are common.', reach.note].filter(Boolean).join(' '),
    });
  }

  // 🚆 Train
  if (reach.railway && origin.station && !island && straightKm > 120) {
    const railKm = straightKm * RAIL_FACTOR;
    const lastMile = reach.railway.km > 3 ? minutes(reach.railway.km / (hills ? SPEED.busHills : SPEED.taxi)) : 10;
    options.push({
      mode: 'train',
      title: `Train ${origin.station} → ${reach.railway.code}`,
      durationMin: minutes(railKm / SPEED.train) + lastMile,
      steps: [
        `Train from ${origin.stationName} (${origin.station}) to ${reach.railway.name} (${reach.railway.code}).`,
        reach.railway.km > 3 ? `About ${reach.railway.km} km by bus / taxi to ${dest.name}.` : `The station is in ${dest.name}.`,
      ],
      links: [{ label: `Search trains on IRCTC (${origin.station} → ${reach.railway.code})`, url: IRCTC_SEARCH_URL }],
      note: 'Book early: popular trains fill up weeks ahead. Overnight trains save a hotel night.',
    });
  }

  // 🚌 Bus
  if (road && road.km < 1400) {
    options.push({
      mode: 'bus',
      title: `Bus ${origin.name} → ${dest.busName ?? dest.name}`,
      durationMin: minutes(road.km / (hills ? SPEED.busHills : SPEED.bus)),
      steps: [`About ${Math.round(road.km)} km by road.`],
      links: [{ label: 'Search buses (redBus)', url: redBusUrl(origin.name, dest.busName ?? dest.name) }],
      note: 'Not every city pair has direct buses; you may need to change at a bigger town.',
    });
  }

  // 🚗 Car / taxi
  if (road) {
    options.push({
      mode: 'car',
      title: 'Drive or hire a taxi',
      durationMin: carMin,
      steps: [`${road.source === 'osrm' ? '' : 'About '}${Math.round(road.km)} km by road${road.source === 'osrm' ? ' (road route)' : ' (estimate)'}.`],
      links: [{ label: 'Directions (Google Maps)', url: mapsDirectionsUrl(origin.name, `${dest.name}, ${dest.state}`) }],
      note: hills ? 'Mountain roads are slow; avoid driving after dark.' : 'Plan breaks every 2–3 hours.',
    });
  }

  // ⛴️ Ship (islands)
  if (reach.sea) options.push({ mode: 'ship', title: 'Ship', durationMin: null, steps: [reach.sea], links: [], note: 'Schedules change often; check with the shipping office.' });

  // The best fit for the distance (only among the options that exist).
  const pick = (mode) => options.find((o) => o.mode === mode);
  const fastestGround = Math.min(...options.filter((o) => ['train', 'bus', 'car'].includes(o.mode)).map((o) => o.durationMin ?? Infinity));
  const recommended =
    (island && pick('flight')) ||
    (straightKm > 900 && pick('flight')) ||
    (fastestGround > LONG_GROUND_TRIP_MIN && pick('flight')) ||
    (straightKm >= 250 && reach.railway?.km <= 150 && pick('train')) ||
    (straightKm >= 250 && pick('bus')) ||
    pick('car') ||
    options[0];
  if (recommended) recommended.recommended = true;

  return {
    ...base,
    straightKm,
    road,
    options,
    notes: [
      // General road facts (they may name another city, so they are not a step of this route).
      ...(reach.road && road ? [`By road: ${reach.road}`] : []),
      ...(dest.notes ?? []).filter((n) => /permit|ILP|ferr|altitude|road|open/i.test(n)),
      'Times are estimates for planning. Check schedules and fares on the booking sites.',
    ],
  };
};
