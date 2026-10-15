import test from 'node:test';
import assert from 'node:assert/strict';
import { UpdateTripSchema, buildPackingList, findOriginCity, validate, weatherInfo } from '../src/index.js';

const itinerary = (activities, extra = {}) => ({ durationDays: 3, travelersCount: 2, days: [{ activities }], ...extra });
const ids = (list) => list.groups.flatMap((g) => g.items.map((i) => i.id));
const day = (tMin, tMax, extra = {}) => ({ date: '2026-12-01', tMin, tMax, code: 1, rainMm: 0, ...extra });

test('weather codes → text and icon', () => {
  assert.deepEqual(weatherInfo(0), { summary: 'Clear sky', icon: 'sun' });
  assert.equal(weatherInfo(63).icon, 'rain');
  assert.equal(weatherInfo(73).icon, 'snow');
  assert.equal(weatherInfo(95).summary, 'Thunderstorm');
  assert.equal(weatherInfo(1234).summary, 'Mixed weather');
});

test('origin cities: names, aliases and unknown places', () => {
  assert.equal(findOriginCity('ghaziabad').station, 'GZB');
  assert.equal(findOriginCity('New Delhi').airport, 'DEL');
  assert.equal(findOriginCity('Bangalore').name, 'Bengaluru');
  assert.equal(findOriginCity('Mumbai, Maharashtra').airport, 'BOM');
  assert.equal(findOriginCity('Atlantis'), null);
});

test('packing: cold nights → thermals and jacket; rain → umbrella; with the reason', () => {
  const list = buildPackingList({ itinerary: itinerary([]), weather: [day(-2, 8, { code: 71 }), day(1, 9, { rainChance: 80, code: 61 })] });
  const all = list.groups.flatMap((g) => g.items);
  assert.ok(ids(list).includes('thermal-innerwear'));
  assert.equal(all.find((i) => i.id === 'thermal-innerwear').reason, 'Nights around -2°C');
  assert.ok(ids(list).includes('umbrella-or-raincoat'));
  assert.ok(ids(list).includes('waterproof-shoes-with-good-grip'), 'snow');
  assert.match(list.basedOn.join(' '), /-2–9°C, rain on 2 days/);
});

test('packing: hot beach trip vs temple trip vs high altitude', () => {
  const beach = buildPackingList({ itinerary: itinerary([{ placeName: 'Baga Beach', category: 'Attraction' }]), weather: [day(24, 33)], destination: { terrain: ['beach'] } });
  assert.ok(['swimwear', 'flip-flops', 'light-cotton-clothes', 'ors-sachets'].every((id) => ids(beach).includes(id)));
  assert.ok(!ids(beach).includes('thermal-innerwear'));

  const temples = buildPackingList({ itinerary: itinerary([{ placeName: 'Golden Temple (Harmandir Sahib)', category: 'Attraction' }]) });
  const scarf = temples.groups.flatMap((g) => g.items).find((i) => i.id.startsWith('scarf-or-stole'));
  assert.equal(scarf.reason, 'Golden Temple (Harmandir Sahib)');

  const leh = buildPackingList({ itinerary: itinerary([]), destination: { terrain: ['high-altitude', 'remote'], notes: ['Permits are needed for Nubra'] } });
  assert.ok(ids(leh).some((id) => id.startsWith('altitude-sickness')));
  assert.ok(ids(leh).some((id) => id.startsWith('permit-copies')));
  assert.ok(ids(leh).includes('extra-cash'));
  assert.match(leh.basedOn.join(' '), /weather not loaded/);
});

test('packing: ids are unique and stable; diet and group extras', () => {
  const input = { itinerary: itinerary([{ placeName: 'Triund trek', category: 'Activity' }], { travelersCount: 4, durationDays: 9 }), preferences: { dietaryPreference: 'Jain', interests: ['Photography'] } };
  const a = buildPackingList(input);
  const b = buildPackingList(input);
  assert.deepEqual(a, b);
  assert.equal(new Set(ids(a)).size, ids(a).length);
  assert.ok(ids(a).includes('7-sets-of-everyday-clothes'));
  assert.ok(ids(a).includes('your-own-snacks-for-the-journey'));
  assert.ok(ids(a).includes('shared-first-aid-kit'));
  assert.ok(ids(a).includes('trekking-shoes-with-good-grip'));
  assert.ok(ids(a).includes('camera-and-a-spare-memory-card'));
});

test('trip update accepts the starting city and packing ticks only in the right shape', () => {
  assert.equal(validate(UpdateTripSchema, { originCity: 'Ghaziabad' }).success, true);
  assert.equal(validate(UpdateTripSchema, { packingChecked: ['swimwear', 'sleepwear'] }).success, true);
  assert.equal(validate(UpdateTripSchema, { packingChecked: Array(201).fill('x') }).success, false);
});

test('month ranges for "best time to visit"', async () => {
  const { formatMonthRanges } = await import('../src/index.js');
  assert.equal(formatMonthRanges([10, 11, 12, 1, 2, 3]), 'Oct–Mar');
  assert.equal(formatMonthRanges([3, 4, 5, 10, 11]), 'Mar–May, Oct–Nov');
  assert.equal(formatMonthRanges([7]), 'Jul');
  assert.equal(formatMonthRanges(Array.from({ length: 12 }, (_, i) => i + 1)), 'All year');
  assert.equal(formatMonthRanges([]), '');
});
