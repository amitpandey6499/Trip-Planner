import { z } from 'zod';
import { LIMITS, TRAVEL_STYLE_VALUES } from '../constants.js';
import { optionalText } from './common.js';
import { TripPreferencesSchema } from './preferences.js';

/**
 * Bodies of the Part 8 / Part 9 endpoints. The itinerary inside is only checked loosely here;
 * the server always runs normalizeItinerary() on it (the real contract check).
 */
const looseItinerary = z
  .object({
    destination: z.string({ error: 'Itinerary destination is missing.' }).trim().min(1).max(LIMITS.MAX_DESTINATION_LENGTH),
    days: z.array(z.unknown(), { error: 'Itinerary days are missing.' }).min(1).max(LIMITS.MAX_TRIP_DAYS),
  })
  .passthrough();

/** POST /api/map/enrich → locate places + road routes for an itinerary that is not saved (yet). */
export const MapEnrichSchema = z.object({
  itinerary: looseItinerary,
  // true = ask the routing service again even for days that already have an (estimated) route
  force: z.boolean().optional().default(false),
});

/** POST /api/trips/:id/map → same for a saved trip (result is stored). */
export const SavedTripMapSchema = z.object({
  force: z.boolean().optional().default(false),
});

/** POST /api/trips/regenerate-day → a new plan for ONE day, the rest of the trip stays. */
export const RegenerateDaySchema = z
  .object({
    preferences: TripPreferencesSchema,
    itinerary: looseItinerary,
    dayNumber: z.coerce.number({ error: 'Day number is required.' }).int().min(1),
    // optional: a different pace just for this day
    pace: z.enum(TRAVEL_STYLE_VALUES).optional(),
    // optional wish for the AI ("more relaxed", "add a café"); the offline planner cannot read notes
    note: optionalText('Note', LIMITS.MAX_DAY_NOTE_LENGTH).optional(),
  })
  .refine((data) => data.dayNumber <= data.itinerary.days.length, { path: ['dayNumber'], message: 'That day is not part of this trip.' });

// ── Part 10 / 11 query strings ───────────────────────────────────────────────
const month = z.coerce.number().int().min(1).max(12).optional().catch(undefined);
const placeText = (label) => z.string({ error: `${label} is required.` }).trim().min(2, `${label} is required.`).max(LIMITS.MAX_DESTINATION_LENGTH);
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must look like YYYY-MM-DD.');

/** GET /api/destinations?q=&category=&sort=&month= */
export const DestinationListQuery = z.object({
  q: z.string().trim().max(60).optional().default(''),
  category: z.string().trim().max(30).optional().default('All'),
  sort: z.enum(['popular', 'name', 'budget', 'season']).optional().default('popular').catch('popular'),
  month,
});

/** GET /api/recommendations/hotels?destination=&budget=&checkIn=&checkOut=&travelers= */
export const StaysQuery = z.object({
  destination: placeText('Destination'),
  budget: z.enum(['All', 'Budget', 'Moderate', 'Luxury']).optional().default('All').catch('All'),
  checkIn: isoDay.optional().catch(undefined),
  checkOut: isoDay.optional().catch(undefined),
  travelers: z.coerce.number().int().min(1).max(LIMITS.MAX_TRAVELERS).optional().default(2).catch(2),
});

/** GET /api/recommendations/restaurants?destination=&veg=1 */
export const RestaurantsQuery = z.object({
  destination: placeText('Destination'),
  veg: z
    .enum(['1', '0', 'true', 'false'])
    .optional()
    .transform((v) => v === '1' || v === 'true')
    .catch(false),
});

/** GET /api/travel/weather?destination=&start=&end=&lat=&lng= */
export const WeatherQuery = z
  .object({
    destination: placeText('Destination'),
    start: isoDay,
    end: isoDay,
    lat: z.coerce.number().min(-90).max(90).optional().catch(undefined),
    lng: z.coerce.number().min(-180).max(180).optional().catch(undefined),
  })
  .refine((q) => q.end >= q.start, { path: ['end'], message: 'End date cannot be before start date.' })
  .refine((q) => (Date.parse(q.end) - Date.parse(q.start)) / 86400000 < LIMITS.MAX_TRIP_DAYS, {
    path: ['end'],
    message: `At most ${LIMITS.MAX_TRIP_DAYS} days.`,
  });

/** GET /api/travel/reach?from=&to=&date=&travelers= */
export const ReachQuery = z.object({
  from: placeText('Starting city'),
  to: placeText('Destination'),
  date: isoDay.optional().catch(undefined),
  travelers: z.coerce.number().int().min(1).max(LIMITS.MAX_TRAVELERS).optional().default(2).catch(2),
});
