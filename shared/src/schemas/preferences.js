import { z } from 'zod';
import {
  BUDGET_TIER_VALUES,
  DIETARY_OPTIONS,
  INTERESTS,
  LANGUAGES,
  LIMITS,
  STAY_TYPES,
  TRAVEL_STYLE_VALUES,
} from '../constants.js';
import { addDays, calcDuration, todayIso } from '../utils/dates.js';
import { isoDate, optionalText, requiredText, wholeNumber } from './common.js';

/**
 * Trip preferences = what the user enters in the Create Trip wizard
 * and what POST /api/trips/generate accepts.
 *
 * Split into the wizard's steps so the client can validate one step at a time
 * with EXACTLY the same rules (and messages) the server uses.
 */

// Step 1 — Where & when
const whereWhenShape = {
  destination: requiredText('Destination', { min: 2, max: LIMITS.MAX_DESTINATION_LENGTH }),
  startDate: isoDate('Start date'),
  // Send endDate OR durationDays. If both are sent, the dates win.
  endDate: isoDate('End date').optional(),
  durationDays: wholeNumber('Duration')
    .pipe(z.number().min(1, 'Duration must be at least 1 day.').max(LIMITS.MAX_TRIP_DAYS, `Trips can be at most ${LIMITS.MAX_TRIP_DAYS} days long.`))
    .optional(),
};

// Step 2 — Who & budget
const whoBudgetShape = {
  travelersCount: wholeNumber('Travelers')
    .pipe(
      z
        .number()
        .min(LIMITS.MIN_TRAVELERS, 'At least 1 traveler is needed.')
        .max(LIMITS.MAX_TRAVELERS, `At most ${LIMITS.MAX_TRAVELERS} travelers are allowed.`),
    )
    .default(2),
  totalBudget: wholeNumber('Budget').pipe(
    z
      .number()
      .min(LIMITS.MIN_BUDGET, `Budget must be at least ₹${LIMITS.MIN_BUDGET.toLocaleString('en-IN')}.`)
      .max(LIMITS.MAX_BUDGET, `Budget can be at most ₹${LIMITS.MAX_BUDGET.toLocaleString('en-IN')}.`),
  ),
  budgetCategory: z.enum(BUDGET_TIER_VALUES, { error: 'Please pick a budget style.' }).default('Moderate'),
};

// Step 3 — Style & interests
const styleShape = {
  interests: z
    .array(z.enum(INTERESTS, { error: 'Unknown interest selected.' }))
    .max(LIMITS.MAX_INTERESTS)
    .default([])
    .transform((list) => [...new Set(list)]),
  travelStyle: z.enum(TRAVEL_STYLE_VALUES, { error: 'Please pick a travel pace.' }).default('Balanced'),
  accommodationType: z.enum(STAY_TYPES, { error: 'Please pick a stay type.' }).default('Mid-Range Hotel'),
  dietaryPreference: z.enum(DIETARY_OPTIONS, { error: 'Please pick a food preference.' }).default('No Restrictions'),
  specialNotes: optionalText('Special notes', LIMITS.MAX_NOTES_LENGTH).default(''),
  // Used from Part 11 ("how to reach") and Part 16 (Hindi output). Optional, so older data stays valid.
  originCity: optionalText('Starting city', LIMITS.MAX_DESTINATION_LENGTH).optional(),
  language: z.enum(LANGUAGES.map((l) => l.value)).default('en'),
};

/** Which wizard step each field belongs to (used to jump back to the right step on errors). */
export const PREFERENCE_FIELD_STEP = Object.freeze({
  ...Object.fromEntries(Object.keys(whereWhenShape).map((key) => [key, 1])),
  ...Object.fromEntries(Object.keys(whoBudgetShape).map((key) => [key, 2])),
  ...Object.fromEntries(Object.keys(styleShape).map((key) => [key, 3])),
});

/** Date rules that involve more than one field. */
const checkDates = (data, ctx) => {
  if (!data.startDate) return;
  const earliest = addDays(todayIso(), -LIMITS.PAST_DATE_GRACE_DAYS);
  if (data.startDate < earliest) {
    ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'Start date cannot be in the past.' });
  }
  if (data.endDate) {
    if (data.endDate < data.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date cannot be before start date.' });
    } else if (calcDuration(data.startDate, data.endDate) > LIMITS.MAX_TRIP_DAYS) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: `Trips can be at most ${LIMITS.MAX_TRIP_DAYS} days long.` });
    }
  }
};

/** Fill in whichever of endDate / durationDays is missing. */
const withDuration = (data) => {
  const durationDays = data.endDate ? calcDuration(data.startDate, data.endDate) : (data.durationDays ?? 3);
  const endDate = data.endDate ?? addDays(data.startDate, durationDays - 1);
  return { ...data, durationDays, endDate };
};

export const WhereWhenSchema = z.object(whereWhenShape).superRefine(checkDates);
export const WhoBudgetSchema = z.object(whoBudgetShape);
export const StyleSchema = z.object(styleShape);

/** Wizard step number → schema for that step. */
export const PREFERENCE_STEP_SCHEMAS = Object.freeze({ 1: WhereWhenSchema, 2: WhoBudgetSchema, 3: StyleSchema });

/** Full preferences. Output always has destination, startDate, endDate and durationDays. */
export const TripPreferencesSchema = z
  .object({ ...whereWhenShape, ...whoBudgetShape, ...styleShape })
  .superRefine(checkDates)
  .transform(withDuration);
