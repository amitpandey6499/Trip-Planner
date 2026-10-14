import test from 'node:test';
import assert from 'node:assert/strict';
import { budgetShares, computeBudget, formatINR, suggestBudgetTier, tagsToInterests, INTERESTS } from '../src/index.js';

test('formatINR uses Indian digit grouping', () => {
  assert.equal(formatINR(150000), '₹1,50,000');
  assert.equal(formatINR(999.6), '₹1,000');
  assert.equal(formatINR(NaN), '₹0');
});

test('suggestBudgetTier works per person per day', () => {
  assert.equal(suggestBudgetTier(8000, 2, 4), 'Budget'); // 1,000 pp/day
  assert.equal(suggestBudgetTier(30000, 2, 4), 'Moderate'); // 3,750 pp/day
  assert.equal(suggestBudgetTier(100000, 2, 4), 'Luxury'); // 12,500 pp/day
});

test('computeBudget always adds up', () => {
  const days = [
    { activities: [{ category: 'Attraction', cost: 500 }, { category: 'Restaurant', cost: 800 }] },
    { activities: [{ category: 'Transit', cost: 1200 }, { category: 'Shopping', cost: 300 }] },
  ];
  const { breakdown, dayTotals } = computeBudget({ days, hotels: [{ pricePerNight: 3000 }], travelersCount: 3, durationDays: 2 });
  assert.deepEqual(dayTotals, [1300, 1500]);
  assert.equal(breakdown.accommodation, 3000 * 1 * 2, '1 night × 2 rooms for 3 people');
  assert.equal(breakdown.activitiesAndSightseeing, 800);
  assert.equal(breakdown.foodAndDining, 800);
  assert.equal(breakdown.localTransport, 1200);
  assert.equal(
    breakdown.totalEstimated,
    breakdown.accommodation + breakdown.activitiesAndSightseeing + breakdown.foodAndDining + breakdown.localTransport,
  );
  assert.equal(breakdown.totalEstimated, breakdown.accommodation + dayTotals[0] + dayTotals[1]);
});

test('budgetShares sum to exactly 100', () => {
  const shares = budgetShares({ accommodation: 1, activitiesAndSightseeing: 1, foodAndDining: 1, localTransport: 0 });
  assert.equal(Object.values(shares).reduce((a, b) => a + b, 0), 100);
  assert.deepEqual(Object.values(budgetShares({})), [0, 0, 0, 0]);
});

test('tagsToInterests only returns valid wizard interests', () => {
  const result = tagsToInterests(['Mountains', 'Forts', 'Scuba Diving', 'Unknown tag', 'Beaches']);
  assert.deepEqual(result.sort(), ['Adventure', 'Beaches', 'History & Culture', 'Nature & Outdoors']);
  assert.ok(result.every((i) => INTERESTS.includes(i)));
});
