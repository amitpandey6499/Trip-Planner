import { ACTIVITY_BUDGET_BUCKET, BUDGET_TIERS, CURRENCY } from '../constants.js';

/**
 * Money convention (see docs/CONTRACTS.md):
 *   - every amount is a whole number of rupees (INR)
 *   - every cost in an itinerary is the TOTAL for the whole group, not per person
 */

/** 12345 → '₹12,345' (Indian grouping: 1,00,000) */
export const formatINR = (amount) => {
  const value = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `₹${value.toLocaleString('en-IN')}`;
};

export const sumCosts = (activities = []) => activities.reduce((total, a) => total + (Number.isFinite(a?.cost) ? a.cost : 0), 0);

/** Rooms needed for the group (2 people per room). */
export const roomsNeeded = (travelersCount) => Math.max(1, Math.ceil((travelersCount || 1) / 2));

/** Nights for a trip of N days (a 1-day trip has no night stay). */
export const nightsFor = (durationDays) => Math.max(0, (durationDays || 1) - 1);

/**
 * Suggest a budget tier from the total budget.
 *   suggestBudgetTier(15000, 2, 4) → ₹1,875 per person per day → 'Budget'
 */
export const suggestBudgetTier = (totalBudget, travelersCount = 1, durationDays = 1) => {
  const perPersonPerDay = totalBudget / Math.max(1, travelersCount) / Math.max(1, durationDays);
  return BUDGET_TIERS.find((tier) => perPersonPerDay <= tier.maxPerPersonPerDay)?.value ?? 'Moderate';
};

/**
 * Build a budget that ALWAYS adds up, bottom-up from the itinerary:
 *   - each day's estimatedDailyExpense = sum of that day's activity costs
 *   - activity costs go to a bucket by category (Restaurant → food, Transit → transport, ...)
 *   - accommodation = given amount, else first hotel's price × nights × rooms
 *   - totalEstimated = sum of the four buckets
 */
export const computeBudget = ({ days = [], hotels = [], accommodation, travelersCount = 1, durationDays }) => {
  const breakdown = {
    accommodation: 0,
    activitiesAndSightseeing: 0,
    foodAndDining: 0,
    localTransport: 0,
  };

  const dayTotals = days.map((day) => {
    for (const activity of day.activities ?? []) {
      const bucket = ACTIVITY_BUDGET_BUCKET[activity.category] ?? 'activitiesAndSightseeing';
      breakdown[bucket] += Number.isFinite(activity.cost) ? activity.cost : 0;
    }
    return sumCosts(day.activities);
  });

  const nights = nightsFor(durationDays ?? days.length);
  const hotelStay = hotels[0]?.pricePerNight ? hotels[0].pricePerNight * nights * roomsNeeded(travelersCount) : 0;
  breakdown.accommodation += Number.isFinite(accommodation) && accommodation > 0 ? Math.round(accommodation) : hotelStay;

  const totalEstimated =
    breakdown.accommodation + breakdown.activitiesAndSightseeing + breakdown.foodAndDining + breakdown.localTransport;

  return { breakdown: { ...breakdown, totalEstimated, currency: CURRENCY }, dayTotals };
};

/** Percentage of each bucket (rounded so they add up to 100 when total > 0). */
export const budgetShares = (breakdown) => {
  const keys = ['accommodation', 'activitiesAndSightseeing', 'foodAndDining', 'localTransport'];
  const total = keys.reduce((sum, key) => sum + (breakdown?.[key] || 0), 0);
  if (!total) return Object.fromEntries(keys.map((key) => [key, 0]));
  const raw = keys.map((key) => ((breakdown[key] || 0) / total) * 100);
  const floored = raw.map(Math.floor);
  let remainder = 100 - floored.reduce((a, b) => a + b, 0);
  // give the leftover percent to the biggest fractional parts
  const order = raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (remainder <= 0) break;
    floored[i] += 1;
    remainder -= 1;
  }
  return Object.fromEntries(keys.map((key, i) => [key, floored[i]]));
};
