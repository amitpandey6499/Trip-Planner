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
