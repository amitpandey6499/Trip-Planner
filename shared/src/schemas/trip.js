import { z } from 'zod';
import { BUDGET_TIER_VALUES, LIMITS } from '../constants.js';
import { calcDuration } from '../utils/dates.js';
import { isoDate, requiredText, wholeNumber } from './common.js';

/**
 * Trip = the saved record (one row on "My Trips").
 * Its itinerary is stored next to it and follows ItinerarySchema.
 * Trip phase (Upcoming / Ongoing / Past) is calculated with tripPhase(), not stored.
 */

const tripFields = {
  title: requiredText('Title', { max: LIMITS.MAX_TITLE_LENGTH }),
  destination: requiredText('Destination', { min: 2, max: LIMITS.MAX_DESTINATION_LENGTH }),
  startDate: isoDate('Start date'),
  endDate: isoDate('End date'),
  travelersCount: wholeNumber('Travelers').pipe(z.number().min(LIMITS.MIN_TRAVELERS).max(LIMITS.MAX_TRAVELERS)),
  totalBudget: wholeNumber('Budget').pipe(z.number().min(0).max(LIMITS.MAX_BUDGET)),
  budgetCategory: z.enum(BUDGET_TIER_VALUES).default('Moderate'),
  destinationImage: z.string().trim().regex(/^https?:\/\//).optional().catch(undefined),
};

const checkTripDates = (data, ctx) => {
  if (!data.startDate || !data.endDate) return;
  if (data.endDate < data.startDate) {
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date cannot be before start date.' });
  } else if (calcDuration(data.startDate, data.endDate) > LIMITS.MAX_TRIP_DAYS) {
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: `Trips can be at most ${LIMITS.MAX_TRIP_DAYS} days long.` });
  }
};

/** Body of POST /api/trips → { tripData, itinerary } (itinerary is validated with ItinerarySchema separately). */
export const SaveTripSchema = z.object({
  tripData: z
    .object({
      id: z.string().trim().max(64).optional(),
      ...tripFields,
      title: tripFields.title.optional(),
    })
    .superRefine(checkTripDates),
  itinerary: z.unknown().optional(),
});

/** Body of PUT /api/trips/:id — only these fields can ever change. */
export const UpdateTripSchema = z
  .object({
    title: tripFields.title,
    startDate: tripFields.startDate,
    endDate: tripFields.endDate,
    travelersCount: tripFields.travelersCount,
    totalBudget: tripFields.totalBudget,
    budgetCategory: z.enum(BUDGET_TIER_VALUES),
  })
  .partial()
  .superRefine(checkTripDates)
  .refine((data) => Object.keys(data).length > 0, 'Nothing to update.');

/** Shape of a trip as the API returns it. */
export const TripSummarySchema = z.object({
  id: z.string(),
  userId: z.string(),
  ...tripFields,
  durationDays: z.number().int().min(1),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
