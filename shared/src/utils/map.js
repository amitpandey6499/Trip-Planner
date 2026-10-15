/**
 * Map helpers shared by server (map service) and client (map + timeline).
 * Coordinates are { lat, lng }; route geometry is [[lat, lng], ...].
 */

const EARTH_KM = 6371;
// Roads are longer than a straight line and Indian city/hill traffic is slow: used only when
// the routing service cannot be reached, and always labelled "estimate" in the app.
export const ROAD_FACTOR = 1.35;
export const ESTIMATE_SPEED_KMH = 25;

const toRad = (deg) => (deg * Math.PI) / 180;

/** Straight-line distance in km. */
export const haversineKm = (a, b) => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
};

export const roundKm = (km) => Math.round(km * 10) / 10;

const isAllDay = (activity) => /^(all day|as needed|full day)$/i.test(String(activity?.timeSlot ?? '').trim());

/**
 * The stops of a day's route, in visiting order.
 * Transit items are only stops when they start or end the day (arrival / departure);
 * "local travel for the day" style items are not places. Two stops at the same spot count once.
 */
export const mapStops = (day) => {
  const activities = Array.isArray(day?.activities) ? day.activities : [];
  const stops = [];
  activities.forEach((activity, i) => {
    const c = activity?.coordinates;
    if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return;
    if (activity.locationSource === 'none') return;
    if (activity.category === 'Transit' && (isAllDay(activity) || (i !== 0 && i !== activities.length - 1))) return;
    const previous = stops[stops.length - 1];
    if (previous && haversineKm(previous.coordinates, c) < 0.05) return;
    stops.push({ id: String(activity.id ?? `stop-${i + 1}`), coordinates: { lat: c.lat, lng: c.lng } });
  });
  return stops;
};

/** Short fingerprint (FNV-1a) of the stops, so a changed day gets a new route. */
export const routeSignature = (stops) => {
  const text = stops.map((s) => `${s.id}@${s.coordinates.lat.toFixed(5)},${s.coordinates.lng.toFixed(5)}`).join('|');
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${stops.length}-${hash.toString(36)}`;
};

/** Route made from straight lines (routing service unavailable, or fewer than 2 stops). */
export const estimateRoute = (stops) => {
  const signature = routeSignature(stops);
  if (stops.length < 2) {
    return { provider: 'none', distanceKm: 0, durationMin: 0, stopIds: stops.map((s) => s.id), legs: [], geometry: [], signature };
  }
  const legs = stops.slice(1).map((stop, i) => {
    const km = haversineKm(stops[i].coordinates, stop.coordinates) * ROAD_FACTOR;
    return { distanceKm: roundKm(km), durationMin: Math.max(1, Math.round((km / ESTIMATE_SPEED_KMH) * 60)) };
  });
  return {
    provider: 'estimate',
    distanceKm: roundKm(legs.reduce((sum, leg) => sum + leg.distanceKm, 0)),
    durationMin: legs.reduce((sum, leg) => sum + leg.durationMin, 0),
    stopIds: stops.map((s) => s.id),
    legs,
    geometry: stops.map((s) => [s.coordinates.lat, s.coordinates.lng]),
    signature,
  };
};

const allPlaces = (itinerary) => [
  ...(itinerary.days ?? []).flatMap((day) => day.activities ?? []),
  ...(itinerary.hotels ?? []),
  ...(itinerary.restaurants ?? []),
];

/** True when places still need locating or a day's route is missing / out of date. */
export const needsMapUpdate = (itinerary) => {
  if (!itinerary?.days?.length) return false;
  if (allPlaces(itinerary).some((place) => !place.locationSource)) return true;
  return itinerary.days.some((day) => !day.route || day.route.signature !== routeSignature(mapStops(day)));
};

/** Places that have a position on the map / all places. */
export const countLocated = (itinerary) => {
  const places = allPlaces(itinerary ?? {});
  return { located: places.filter((p) => p.coordinates && p.locationSource !== 'none').length, total: places.length };
};

/** 95 → "1 h 35 min", 40 → "40 min". */
export const formatDuration = (minutes) => {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
};

/** 0.45 → "450 m", 12.34 → "12.3 km", 123.4 → "123 km". */
export const formatKm = (km) => {
  const value = Math.max(0, Number(km) || 0);
  if (value < 1) return `${Math.round(value * 1000)} m`;
  return value < 100 ? `${roundKm(value)} km` : `${Math.round(value)} km`;
};
