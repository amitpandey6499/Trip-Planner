import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeItinerary, ItineraryError, addDays, todayIso } from '../src/index.js';

const sample = JSON.parse(fs.readFileSync(new URL('../../server/src/data/sampleItineraries.json', import.meta.url), 'utf8')).manali;
const prefs = {
  destination: 'Manali',
  startDate: addDays(todayIso(), 20),
  endDate: addDays(todayIso(), 23),
  durationDays: 4,
  travelersCount: 2,
  totalBudget: 20000,
  budgetCategory: 'Moderate',
};

test('normalizeItinerary: dates, ids and numbers that add up', () => {
  const it = normalizeItinerary(sample, prefs, { expectDays: 4 });
  assert.equal(it.days.length, 4);
  assert.deepEqual(it.days.map((d) => d.date), [0, 1, 2, 3].map((i) => addDays(prefs.startDate, i)));
  assert.ok(it.days.every((d, i) => d.dayNumber === i + 1 && d.id));
  assert.ok(it.days.every((d) => d.activities.every((a) => a.id)));
  for (const day of it.days) {
    assert.equal(day.estimatedDailyExpense, day.activities.reduce((s, a) => s + a.cost, 0));
  }
  const b = it.budgetBreakdown;
  assert.equal(b.totalEstimated, b.accommodation + b.activitiesAndSightseeing + b.foodAndDining + b.localTransport);
  assert.equal(it.estimatedTotal, b.totalEstimated);
  assert.equal(it.withinBudget, it.estimatedTotal <= prefs.totalBudget);
  assert.equal(it.totalBudget, 20000, 'user budget comes from preferences');
});

test('normalizeItinerary is idempotent (safe to run on save)', () => {
  const once = normalizeItinerary(sample, prefs);
  const twice = normalizeItinerary(once, prefs);
  assert.deepEqual(twice, once);
});

test('normalizeItinerary tolerates small AI mistakes', () => {
  const messy = {
    title: 'Goa',
    source: 'Google Gemini AI (Live)',
    budgetBreakdown: { accommodation: '6,000' },
    days: [
      {
        title: 'Beach day',
        activities: [
          { placeName: 'Baga Beach', cost: '₹1,200', category: 'Beach', imageUrl: 'not a url', coordinates: { lat: 999, lng: 1 } },
          { placeName: 'Hotel check-in', category: 'Hotel', cost: 4000 },
        ],
      },
    ],
  };
  const it = normalizeItinerary(messy, { destination: 'Goa', durationDays: 1, totalBudget: 5000 });
  const [beach, hotel] = it.days[0].activities;
  assert.equal(it.source, 'gemini');
  assert.equal(beach.cost, 1200);
  assert.equal(beach.category, 'Attraction', 'unknown category falls back');
  assert.equal(beach.imageUrl, undefined, 'bad url dropped');
  assert.equal(beach.coordinates, undefined, 'bad coordinates dropped');
  assert.equal(hotel.cost, 0, 'hotel stay moved out of the day total');
  assert.equal(it.budgetBreakdown.accommodation, 10000, '6,000 given + 4,000 hotel activity');
  assert.equal(it.withinBudget, false);
});

test('normalizeItinerary rejects broken structure', () => {
  assert.throws(() => normalizeItinerary(null), ItineraryError);
  assert.throws(() => normalizeItinerary({ title: 'x', days: [] }, { destination: 'Goa', durationDays: 1 }), /at least one day/);
  assert.throws(() => normalizeItinerary({ title: 'x', days: [{ title: 'd', activities: [{ cost: 5 }] }] }, { destination: 'Goa' }), /place name/);
  assert.throws(() => normalizeItinerary(sample, prefs, { expectDays: 3 }), /4 days but 3 were requested/);
});
