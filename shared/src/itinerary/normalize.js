import { ITINERARY_SOURCES } from '../constants.js';
import { ItinerarySchema } from '../schemas/itinerary.js';
import { computeBudget } from '../utils/budget.js';
import { addDays, isValidIsoDate } from '../utils/dates.js';
import { formatZodError } from '../validation.js';

export class ItineraryError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'ItineraryError';
    this.details = details;
  }
}

// Old itineraries stored a sentence in `source`; map them to the new keys.
const legacySource = (value) => {
  if (typeof value !== 'string') return undefined;
  if (value in ITINERARY_SOURCES) return value;
  if (/gemini/i.test(value)) return 'gemini';
  if (/offline demo mode/i.test(value)) return 'sample';
  return 'offline';
};

const asArray = (value) => (Array.isArray(value) ? value : []);

/**
 * Make ANY itinerary (from Gemini, the sample data, or an old saved trip) follow the
 * contract and have numbers that add up:
 *   - days renumbered 1..N, dated from the trip start date, ids added (days, activities, stays, restaurants)
 *   - trip facts (dates, travelers, budget) taken from the user's preferences
 *   - budget recomputed bottom-up (see computeBudget), withinBudget flag set
 *
 * Throws ItineraryError when the structure is unusable (no days, nameless activities,
 * wrong number of days). Running it twice gives the same result.
 *
 * @param {object} raw        itinerary-like object
 * @param {object} prefs      validated TripPreferences (optional fields allowed)
 * @param {{ expectDays?: number }} options
 */
export const normalizeItinerary = (raw, prefs = {}, { expectDays } = {}) => {
  if (!raw || typeof raw !== 'object') throw new ItineraryError('Itinerary is empty.');

  const rawDays = asArray(raw.days);
  const startDate = isValidIsoDate(prefs.startDate) ? prefs.startDate : raw.startDate;
  const durationDays = prefs.durationDays ?? raw.durationDays ?? rawDays.length;
  const destination = (typeof raw.destination === 'string' && raw.destination.trim()) || prefs.destination;

  let hotelActivityCosts = 0;
  const days = rawDays.map((day, i) => ({
    ...day,
    id: day?.id || `day-${i + 1}`,
    dayNumber: i + 1,
    date: isValidIsoDate(startDate) ? addDays(startDate, i) : day?.date,
    activities: asArray(day?.activities).map((activity, j) => {
      const next = { ...activity, id: activity?.id || `d${i + 1}-a${j + 1}` };
      // A hotel stay is a trip-level cost: move it into "accommodation" instead of the day total.
      if (activity?.category === 'Hotel' && Number(activity.cost) > 0) {
        hotelActivityCosts += Math.round(Number(activity.cost)) || 0;
        next.cost = 0;
      }
      return next;
    }),
  }));

  const draft = {
    ...raw,
    source: legacySource(raw.source),
    destination,
    title: (typeof raw.title === 'string' && raw.title.trim()) || `${durationDays}-Day Trip to ${destination}`,
    startDate,
    endDate: prefs.endDate ?? raw.endDate,
    durationDays,
    travelersCount: prefs.travelersCount ?? raw.travelersCount ?? 1,
    budgetCategory: prefs.budgetCategory ?? raw.budgetCategory,
    totalBudget: prefs.totalBudget ?? raw.totalBudget ?? 0,
    budgetBreakdown: raw.budgetBreakdown ?? {},
    days,
    // ids so the map and the cards can point at one stay / restaurant (Part 8)
    hotels: asArray(raw.hotels).map((hotel, i) => (hotel && typeof hotel === 'object' ? { ...hotel, id: hotel.id || `hotel-${i + 1}` } : hotel)),
    restaurants: asArray(raw.restaurants).map((place, i) => (place && typeof place === 'object' ? { ...place, id: place.id || `restaurant-${i + 1}` } : place)),
  };

  const parsed = ItinerarySchema.safeParse(draft);
  if (!parsed.success) {
    const { message, fields } = formatZodError(parsed.error);
    throw new ItineraryError(`Itinerary is invalid: ${message}`, fields);
  }
  const itinerary = parsed.data;

  if (expectDays && itinerary.days.length !== expectDays) {
    throw new ItineraryError(`Itinerary has ${itinerary.days.length} days but ${expectDays} were requested.`);
  }

  const givenStay = itinerary.budgetBreakdown.accommodation;
  const { breakdown, dayTotals } = computeBudget({
    days: itinerary.days,
    hotels: itinerary.hotels,
    accommodation: (givenStay > 0 ? givenStay : undefined) === undefined && hotelActivityCosts === 0 ? undefined : givenStay + hotelActivityCosts,
    travelersCount: itinerary.travelersCount,
    durationDays: itinerary.durationDays,
  });

  itinerary.days.forEach((day, i) => {
    day.estimatedDailyExpense = dayTotals[i];
  });
  itinerary.budgetBreakdown = breakdown;
  itinerary.estimatedTotal = breakdown.totalEstimated;
  itinerary.withinBudget = !itinerary.totalBudget || breakdown.totalEstimated <= itinerary.totalBudget;
  return itinerary;
};
