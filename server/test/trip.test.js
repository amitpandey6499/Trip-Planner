import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, todayIso, TripPreferencesSchema } from '@tripplanner/shared';
import { searchDestinations } from '../src/services/placesService.js';
import { generateItinerary } from '../src/services/aiService.js';

const prefs = (input) => TripPreferencesSchema.parse({ startDate: addDays(todayIso(), 14), totalBudget: 15000, ...input });

test('Places Service: searchDestinations returns matching destinations', () => {
  const results = searchDestinations('manali', 'all');
  assert.ok(results.length > 0, 'Should find Manali');
  assert.strictEqual(results[0].name, 'Manali');
  assert.strictEqual(results[0].category, 'Mountains');
});

test('Places Service: filter by category Mountains', () => {
  const mountains = searchDestinations('', 'Mountains');
  assert.ok(mountains.length > 0, 'Should return mountain destinations');
  assert.ok(mountains.every((m) => m.category === 'Mountains' || m.tags.includes('Mountains')));
});

test('AI Service: Manali 4 days uses the curated sample, numbers add up', async () => {
  const itinerary = await generateItinerary(prefs({ destination: 'Manali', durationDays: 4, interests: ['Adventure'] }));
  assert.equal(itinerary.source, 'sample');
  assert.equal(itinerary.destination, 'Manali');
  assert.equal(itinerary.days.length, 4);
  const b = itinerary.budgetBreakdown;
  assert.equal(b.totalEstimated, b.accommodation + b.activitiesAndSightseeing + b.foodAndDining + b.localTransport);
  assert.equal(itinerary.totalBudget, 15000, 'user budget kept');
});

test('AI Service: any other city gets exactly the requested number of days', async () => {
  const itinerary = await generateItinerary(prefs({ destination: 'Shimla', durationDays: 6 }));
  assert.equal(itinerary.source, 'offline');
  assert.equal(itinerary.days.length, 6);
  assert.equal(itinerary.days[0].date, addDays(todayIso(), 14));
});
