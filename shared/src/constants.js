/**
 * Fixed option lists used by BOTH the client (wizard, filters) and the server
 * (validation, AI prompt). Change an option here and both sides follow.
 *
 * Values are stored in saved trips, so do not rename an existing value
 * without a migration (Part 3, `schemaVersion`).
 */

export const CURRENCY = 'INR';

export const LIMITS = Object.freeze({
  MAX_TRIP_DAYS: 14,
  MIN_BUDGET: 1000,
  MAX_BUDGET: 10_000_000,
  MIN_TRAVELERS: 1,
  MAX_TRAVELERS: 20,
  MAX_INTERESTS: 12,
  MAX_NOTES_LENGTH: 500,
  MAX_DESTINATION_LENGTH: 80,
  MAX_TITLE_LENGTH: 120,
  // A start date one day in the past is still accepted (user and server time zones can differ).
  PAST_DATE_GRACE_DAYS: 1,
});

export const INTERESTS = Object.freeze([
  'Nature & Outdoors',
  'Adventure',
  'History & Culture',
  'Food & Cuisine',
  'Beaches',
  'Shopping',
  'Wildlife',
  'Nightlife',
  'Relaxation',
  'Photography',
  'Spiritual Places',
  'Hidden Gems',
]);

/**
 * Budget tiers. `perPersonPerDay` is used to SUGGEST a tier from the total budget
 * (see suggestBudgetTier in utils/budget.js). The user can still pick any tier.
 */
export const BUDGET_TIERS = Object.freeze([
  Object.freeze({ value: 'Budget', label: 'Budget Friendly', hint: 'Up to ₹2,000 per person per day', maxPerPersonPerDay: 2000 }),
  Object.freeze({ value: 'Moderate', label: 'Moderate / Balanced', hint: '₹2,000 – ₹5,000 per person per day', maxPerPersonPerDay: 5000 }),
  Object.freeze({ value: 'Luxury', label: 'Luxury Experience', hint: 'Above ₹5,000 per person per day', maxPerPersonPerDay: Infinity }),
]);
export const BUDGET_TIER_VALUES = Object.freeze(BUDGET_TIERS.map((t) => t.value));

export const TRAVEL_STYLES = Object.freeze([
  Object.freeze({ value: 'Relaxed', label: 'Relaxed', hint: '2–3 places a day, lots of free time' }),
  Object.freeze({ value: 'Balanced', label: 'Balanced', hint: '3–4 places a day' }),
  Object.freeze({ value: 'Packed', label: 'Packed', hint: 'See as much as possible' }),
]);
export const TRAVEL_STYLE_VALUES = Object.freeze(TRAVEL_STYLES.map((s) => s.value));

export const STAY_TYPES = Object.freeze(['Hostel / Homestay', 'Mid-Range Hotel', 'Luxury Hotel / Resort']);

export const DIETARY_OPTIONS = Object.freeze(['No Restrictions', 'Vegetarian', 'Vegan', 'Jain', 'Halal']);

/** Itinerary activity types. Map pin colours and budget categories depend on these. */
export const ACTIVITY_CATEGORIES = Object.freeze(['Attraction', 'Activity', 'Restaurant', 'Transit', 'Hotel', 'Shopping']);

/** Which budget bucket an activity's cost counts towards. */
export const ACTIVITY_BUDGET_BUCKET = Object.freeze({
  Attraction: 'activitiesAndSightseeing',
  Activity: 'activitiesAndSightseeing',
  Shopping: 'activitiesAndSightseeing',
  Restaurant: 'foodAndDining',
  Transit: 'localTransport',
  Hotel: 'accommodation',
});

/** Explore page filter pills. */
export const DESTINATION_CATEGORIES = Object.freeze(['All', 'Popular', 'Beaches', 'Mountains', 'Cultural', 'Adventure', 'Spiritual', 'Hidden Gems']);

/** Suggestions in the destination box. `value` is what gets sent to the server. */
export const POPULAR_DESTINATIONS = Object.freeze([
  Object.freeze({ value: 'Manali', label: 'Manali, Himachal Pradesh' }),
  Object.freeze({ value: 'Goa', label: 'Goa' }),
  Object.freeze({ value: 'Jaipur', label: 'Jaipur, Rajasthan' }),
  Object.freeze({ value: 'Udaipur', label: 'Udaipur, Rajasthan' }),
  Object.freeze({ value: 'Varanasi', label: 'Varanasi, Uttar Pradesh' }),
  Object.freeze({ value: 'Kerala', label: 'Kerala (Munnar & Alleppey)' }),
  Object.freeze({ value: 'Andaman', label: 'Andaman & Nicobar Islands' }),
  Object.freeze({ value: 'Rishikesh', label: 'Rishikesh, Uttarakhand' }),
]);

/**
 * Destinations the OFFLINE planner knows (used when no Gemini key is set or the AI is unavailable).
 * The server has the curated places for each; the client uses this list to warn early in the wizard.
 * Matching (aliases, "Manali, Himachal Pradesh" ...) lives in utils/destinations.js.
 */
export const OFFLINE_PLANNER_DESTINATIONS = Object.freeze([
  Object.freeze({ name: 'Manali', aliases: Object.freeze(['manali', 'old manali', 'kullu manali']) }),
  Object.freeze({ name: 'Goa', aliases: Object.freeze(['goa', 'north goa', 'south goa', 'panaji', 'panjim', 'calangute', 'baga']) }),
  Object.freeze({ name: 'Jaipur', aliases: Object.freeze(['jaipur', 'pink city']) }),
  Object.freeze({ name: 'Udaipur', aliases: Object.freeze(['udaipur', 'city of lakes']) }),
  Object.freeze({ name: 'Varanasi', aliases: Object.freeze(['varanasi', 'banaras', 'benaras', 'kashi']) }),
  Object.freeze({ name: 'Kerala', aliases: Object.freeze(['kerala', 'munnar', 'alleppey', 'alappuzha', 'kerala (munnar & alleppey)']) }),
  Object.freeze({
    name: 'Andaman',
    aliases: Object.freeze(['andaman', 'andaman & nicobar islands', 'andaman and nicobar', 'port blair', 'havelock', 'swaraj dweep']),
  }),
  Object.freeze({ name: 'Rishikesh', aliases: Object.freeze(['rishikesh', 'tapovan']) }),
]);

/** Trip phase is CALCULATED from dates (utils/dates.js → tripPhase), never stored. */
export const TRIP_PHASES = Object.freeze(['Upcoming', 'Ongoing', 'Past']);

/** Where an itinerary came from. Shown as a badge so the user always knows. */
export const ITINERARY_SOURCES = Object.freeze({
  gemini: 'Generated by Gemini AI',
  sample: 'Curated sample plan',
  offline: 'Offline planner (curated places)',
});

export const LANGUAGES = Object.freeze([
  Object.freeze({ value: 'en', label: 'English' }),
  Object.freeze({ value: 'hi', label: 'हिन्दी' }),
]);
