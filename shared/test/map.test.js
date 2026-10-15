import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ItinerarySchema,
  RegenerateDaySchema,
  addDays,
  estimateRoute,
  formatDuration,
  formatKm,
  haversineKm,
  mapStops,
  needsMapUpdate,
  normalizeItinerary,
  routeSignature,
  todayIso,
  validate,
} from '../src/index.js';

const at = (lat, lng) => ({ lat, lng });
const day = (activities) => ({ title: 'Day', activities });
const act = (id, category, coordinates, timeSlot = '10:00 AM - 11:00 AM') => ({ id, placeName: id, category, coordinates, timeSlot });

test('haversine: Delhi → Agra is about 180 km in a straight line', () => {
  const km = haversineKm(at(28.6139, 77.209), at(27.1767, 78.0081));
  assert.ok(km > 170 && km < 190, String(km));
});

test('mapStops: arrival/departure count, "all day" travel does not, duplicates merged, no coordinates skipped', () => {
  const d = day([
    act('arrive', 'Transit', at(32.24, 77.18)),
    act('local', 'Transit', at(32.24, 77.18), 'All day'),
    act('temple', 'Attraction', at(32.248, 77.181)),
    act('cab', 'Transit', at(32.3, 77.2)), // transit in the middle → not a stop
    act('lunch', 'Restaurant', undefined),
    act('market', 'Shopping', at(32.248, 77.1811)), // ~10 m from temple → same spot
    act('depart', 'Transit', at(32.24, 77.18)),
  ]);
  assert.deepEqual(mapStops(d).map((s) => s.id), ['arrive', 'temple', 'depart']);
});

test('estimateRoute: legs add up, labelled estimate; fewer than 2 stops = none', () => {
  const stops = [{ id: 'a', coordinates: at(15.55, 73.75) }, { id: 'b', coordinates: at(15.5, 73.83) }, { id: 'c', coordinates: at(15.4, 73.9) }];
  const route = estimateRoute(stops);
  assert.equal(route.provider, 'estimate');
  assert.equal(route.legs.length, 2);
  assert.ok(Math.abs(route.distanceKm - (route.legs[0].distanceKm + route.legs[1].distanceKm)) < 0.11);
  assert.deepEqual(route.stopIds, ['a', 'b', 'c']);
  assert.equal(route.signature, routeSignature(stops));
  assert.equal(estimateRoute(stops.slice(0, 1)).provider, 'none');
});

test('needsMapUpdate: unprocessed places or stale routes', () => {
  const d = day([act('x', 'Attraction', at(26.9, 75.8)), act('y', 'Attraction', at(26.95, 75.85))]);
  const it = { days: [d], hotels: [], restaurants: [] };
  assert.equal(needsMapUpdate(it), true, 'places not processed');
  d.activities.forEach((a) => (a.locationSource = 'curated'));
  assert.equal(needsMapUpdate(it), true, 'no route yet');
  d.route = estimateRoute(mapStops(d));
  assert.equal(needsMapUpdate(it), false);
  d.activities[1].coordinates = at(27.0, 75.9);
  assert.equal(needsMapUpdate(it), true, 'stop moved → route is stale');
});

test('normalizeItinerary keeps map data (route, locationSource, map info)', () => {
  const stops = [{ id: 'd1-a1', coordinates: at(15.5, 73.8) }, { id: 'd1-a2', coordinates: at(15.6, 73.7) }];
  const raw = {
    destination: 'Goa',
    title: 'Goa',
    days: [
      {
        title: 'Beaches',
        activities: [
          { placeName: 'Baga Beach', category: 'Attraction', coordinates: stops[0].coordinates, locationSource: 'geocoded' },
          { placeName: 'Fort Aguada', category: 'Attraction', coordinates: stops[1].coordinates, locationSource: 'bogus' },
        ],
        route: estimateRoute(stops),
      },
    ],
    map: { version: 1, updatedAt: '2026-10-15T00:00:00Z', located: 2, total: 2 },
  };
  const it = normalizeItinerary(raw, { startDate: addDays(todayIso(), 5), durationDays: 1 });
  assert.equal(it.days[0].route.provider, 'estimate');
  assert.equal(it.days[0].activities[0].locationSource, 'geocoded');
  assert.equal(it.days[0].activities[1].locationSource, undefined, 'unknown values are dropped, not fatal');
  assert.equal(it.map.located, 2);
  assert.equal(ItinerarySchema.safeParse({ ...it, days: [{ ...it.days[0], route: { provider: 'teleport' } }] }).data.days[0].route, undefined);
});

test('formatters', () => {
  assert.equal(formatDuration(40), '40 min');
  assert.equal(formatDuration(95), '1 h 35 min');
  assert.equal(formatDuration(120), '2 h');
  assert.equal(formatKm(0.45), '450 m');
  assert.equal(formatKm(12.34), '12.3 km');
  assert.equal(formatKm(123.4), '123 km');
});

test('RegenerateDaySchema: day must exist, note length limited', () => {
  const preferences = { destination: 'Goa', startDate: addDays(todayIso(), 5), durationDays: 2, totalBudget: 10000, travelersCount: 2 };
  const itinerary = { destination: 'Goa', days: [{}, {}] };
  assert.equal(validate(RegenerateDaySchema, { preferences, itinerary, dayNumber: 2 }).success, true);
  const tooFar = validate(RegenerateDaySchema, { preferences, itinerary, dayNumber: 3 });
  assert.equal(tooFar.fields.dayNumber, 'That day is not part of this trip.');
  assert.equal(validate(RegenerateDaySchema, { preferences, itinerary, dayNumber: 1, note: 'x'.repeat(301) }).success, false);
});
