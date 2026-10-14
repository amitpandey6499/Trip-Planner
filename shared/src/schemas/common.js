import { z } from 'zod';
import { isValidIsoDate } from '../utils/dates.js';

/** Required text with friendly messages: requiredText('Destination', { min: 2, max: 80 }) */
export const requiredText = (label, { min = 1, max = 200 } = {}) =>
  z
    .string({ error: (issue) => (issue.input === undefined || issue.input === null ? `${label} is required.` : `${label} must be text.`) })
    .trim()
    // Empty text is "required", short text is "too short" — checked in this order.
    .min(1, `${label} is required.`)
    .refine((value) => value.length === 0 || value.length >= min, `${label} must be at least ${min} characters.`)
    .max(max, `${label} can be at most ${max} characters.`);

export const optionalText = (label, max = 500) =>
  z.string({ error: `${label} must be text.` }).trim().max(max, `${label} can be at most ${max} characters.`);

/** 'YYYY-MM-DD' calendar date. */
export const isoDate = (label) =>
  z
    .string({ error: (issue) => (issue.input === undefined || issue.input === null || issue.input === '' ? `${label} is required.` : `${label} must be a date.`) })
    .refine(isValidIsoDate, `${label} must be a valid date (YYYY-MM-DD).`);

/** Whole number from a number or numeric string ("15000"). Empty string counts as missing. */
export const wholeNumber = (label) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : typeof value === 'string' ? Number(value.trim()) : value),
    z
      .number({ error: (issue) => (issue.input === undefined ? `${label} is required.` : `${label} must be a number.`) })
      .refine(Number.isFinite, `${label} must be a number.`)
      .transform(Math.round),
  );

/** Money in an itinerary: tolerant (AI may send "1500" or garbage) → whole rupees ≥ 0, else 0. */
export const money = z.preprocess(
  (value) => (typeof value === 'string' ? Number(value.replace(/[₹,\s]/g, '')) : value),
  z.number().finite().min(0).transform(Math.round),
).catch(0);

export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Optional http(s) URL; anything else is dropped instead of failing the whole itinerary. */
export const optionalUrl = z
  .string()
  .trim()
  .regex(/^https?:\/\/\S+$/)
  .optional()
  .catch(undefined);
