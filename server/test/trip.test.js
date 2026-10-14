import test from 'node:test';
import assert from 'node:assert';
import { searchDestinations } from '../src/services/placesService.js';
import { generateItinerary } from '../src/services/aiService.js';

test('Places Service: searchDestinations returns matching destinations', () => {
  const results = searchDestinations('manali', 'all');
  assert.ok(results.length > 0, 'Should find Manali');
  assert.strictEqual(results[0].name, 'Manali');
  assert.strictEqual(results[0].category, 'Mountains');
});

test('Places Service: filter by category Mountains', () => {
  const mountains = searchDestinations('', 'Mountains');
  assert.ok(mountains.length > 0, 'Should return mountain destinations');
  assert.ok(mountains.every(m => m.category === 'Mountains' || m.tags.includes('Mountains')));
});

test('AI Service: generates structured itinerary for trip', async () => {
  const preferences = {
    destination: 'Manali',
    durationDays: 4,
    totalBudget: 15000,
    travelersCount: 2,
    interests: ['Nature & Outdoors', 'Adventure']
  };

  const itinerary = await generateItinerary(preferences);
  assert.ok(itinerary, 'Itinerary should not be null');
  assert.strictEqual(itinerary.destination, 'Manali');
  assert.ok(itinerary.days.length >= 1, 'Should have at least 1 day');
  assert.ok(itinerary.budgetBreakdown, 'Should calculate budget breakdown');
  assert.strictEqual(itinerary.budgetBreakdown.totalEstimated, 15000);
});
