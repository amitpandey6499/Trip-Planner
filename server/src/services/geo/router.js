import { LIMITS, estimateRoute, roundKm, routeSignature } from '@tripplanner/shared';
import { config } from '../../config/env.js';
import { GeoServiceError, getJson, readGeoCache, writeGeoCache } from './geoHttp.js';

/**
 * Road routes with OSRM (OpenStreetMap data). Default server: FOSSGIS routing.openstreetmap.de
 * (max 1 request/second, identify the app, attribution "Routes: OSRM / FOSSGIS, data © OpenStreetMap").
 * The same API works with any OSRM server (OSRM_URL), including your own.
 */

/** Douglas–Peucker line simplification on [lat, lng] points (keeps the shape, drops near-duplicate points). */
export const simplifyLine = (points, maxPoints = LIMITS.MAX_ROUTE_POINTS) => {
  const round = (p) => [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5];
  if (points.length <= 2) return points.map(round);

  const simplify = (tolerance) => {
    const keep = new Uint8Array(points.length);
    keep[0] = 1;
    keep[points.length - 1] = 1;
    const stack = [[0, points.length - 1]];
    while (stack.length) {
      const [first, last] = stack.pop();
      let maxDist = 0;
      let index = -1;
      const [ay, ax] = points[first];
      const [by, bx] = points[last];
      const dx = bx - ax;
      const dy = by - ay;
      const len2 = dx * dx + dy * dy;
      for (let i = first + 1; i < last; i += 1) {
        const [py, px] = points[i];
        let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
        t = Math.max(0, Math.min(1, t));
        const ex = ax + t * dx - px;
        const ey = ay + t * dy - py;
        const dist = ex * ex + ey * ey;
        if (dist > maxDist) {
          maxDist = dist;
          index = i;
        }
      }
      if (index !== -1 && maxDist > tolerance * tolerance) {
        keep[index] = 1;
        stack.push([first, index], [index, last]);
      }
    }
    return points.filter((_, i) => keep[i]);
  };

  let tolerance = 0.00005; // ≈ 5 m
  let result = simplify(tolerance);
  while (result.length > maxPoints) {
    tolerance *= 2;
    result = simplify(tolerance);
  }
  return result.map(round);
};

/**
 * Road route through the stops (in order).
 * @param {{ id: string, coordinates: {lat,lng} }[]} stops  from mapStops(day)
 * @returns route following DayRouteSchema. Throws GeoServiceError when the service fails.
 *          "No road" (islands, sea crossings) is not an error: an estimate is returned with noRoad: true.
 */
export const roadRoute = async (stops, { signal } = {}) => {
  const signature = routeSignature(stops);
  const stopIds = stops.map((s) => s.id);
  if (stops.length < 2) return estimateRoute(stops);

  // Cache by position only (the same stops in another trip reuse the route).
  const key = `route:v1:${routeSignature(stops.map((s) => ({ id: '', coordinates: s.coordinates })))}`;
  const cached = await readGeoCache(key);
  if (cached) return { ...cached, stopIds, signature };

  const coords = stops.map((s) => `${s.coordinates.lng.toFixed(5)},${s.coordinates.lat.toFixed(5)}`).join(';');
  const url = `${config.map.osrmUrl}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
  const body = await getJson('osrm', url, { signal });

  if (body?.code === 'NoRoute' || body?.code === 'NoSegment') {
    const estimate = { ...estimateRoute(stops), noRoad: true };
    return estimate;
  }
  const route = body?.code === 'Ok' ? body.routes?.[0] : null;
  if (!route || !Array.isArray(route.geometry?.coordinates)) {
    throw new GeoServiceError(`Routing failed (${body?.code ?? 'no answer'})`, { service: 'osrm' });
  }

  const data = {
    provider: 'osrm',
    distanceKm: roundKm(route.distance / 1000),
    durationMin: Math.round(route.duration / 60),
    legs: (route.legs ?? []).map((leg) => ({ distanceKm: roundKm(leg.distance / 1000), durationMin: Math.round(leg.duration / 60) })),
    geometry: simplifyLine(route.geometry.coordinates.map(([lng, lat]) => [lat, lng])),
  };
  await writeGeoCache(key, 'route', data);
  return { ...data, stopIds, signature };
};
