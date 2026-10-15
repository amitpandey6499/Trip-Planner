import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, todayIso, TripPreferencesSchema } from '@tripplanner/shared';
import { generateItinerary } from '../src/services/aiService.js';
import { ApiError } from '../src/utils/ApiError.js';

const prefs = (input) => TripPreferencesSchema.parse({ startDate: addDays(todayIso(), 14), totalBudget: 15000, ...input });

test('AI Service without a key: offline planner for a known destination', async () => {
  const { itinerary, meta } = await generateItinerary(prefs({ destination: 'Manali', durationDays: 4, interests: ['Adventure'] }));
  assert.equal(meta.source, 'offline');
  assert.equal(itinerary.source, 'offline');
  assert.equal(itinerary.days.length, 4);
  const b = itinerary.budgetBreakdown;
  assert.equal(b.totalEstimated, b.accommodation + b.activitiesAndSightseeing + b.foodAndDining + b.localTransport);
  assert.equal(itinerary.totalBudget, 15000, 'user budget kept');
});

test('AI Service without a key: unknown destination → clear 422, never fake places', async () => {
  await assert.rejects(
    () => generateItinerary(prefs({ destination: 'Shimla', durationDays: 3 })),
    (err) => err instanceof ApiError && err.statusCode === 422 && /offline planner only knows/.test(err.message) && err.details.supported.includes('Manali'),
  );
});
