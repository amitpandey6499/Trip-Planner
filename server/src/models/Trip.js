import mongoose from 'mongoose';
import { BUDGET_TIER_VALUES, DIETARY_OPTIONS, INTERESTS, LANGUAGES, STAY_TYPES, TRAVEL_STYLE_VALUES } from '@tripplanner/shared';
import { cleanJSON } from './toJSON.js';

/**
 * A saved trip. Field names match the shared contract (docs/CONTRACTS.md), so the
 * API returns exactly what the client already understands.
 *
 * - Dates are 'YYYY-MM-DD' strings (calendar dates, no time zone problems).
 * - `itinerary` is stored as one document. It is validated and normalized with the
 *   shared ItinerarySchema BEFORE saving (services/tripService.js), so Mongo does not
 *   need to repeat every rule.
 * - `schemaVersion` lets a future migration upgrade old trips safely.
 */
const preferencesSchema = new mongoose.Schema(
  {
    interests: [{ type: String, enum: INTERESTS }],
    travelStyle: { type: String, enum: TRAVEL_STYLE_VALUES, default: 'Balanced' },
    accommodationType: { type: String, enum: STAY_TYPES, default: 'Mid-Range Hotel' },
    dietaryPreference: { type: String, enum: DIETARY_OPTIONS, default: 'No Restrictions' },
    specialNotes: { type: String, maxlength: 500, default: '' },
    originCity: { type: String, maxlength: 80 },
    language: { type: String, enum: LANGUAGES.map((l) => l.value), default: 'en' },
  },
  { _id: false },
);

const isoDate = { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ };

const tripSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    destination: { type: String, required: true, trim: true, maxlength: 80 },
    startDate: isoDate,
    endDate: isoDate,
    durationDays: { type: Number, required: true, min: 1, max: 14 },
    travelersCount: { type: Number, required: true, min: 1, max: 20 },
    totalBudget: { type: Number, required: true, min: 0 },
    budgetCategory: { type: String, enum: BUDGET_TIER_VALUES, default: 'Moderate' },
    destinationImage: { type: String, trim: true },
    preferences: { type: preferencesSchema, default: () => ({}) },
    itinerary: { type: mongoose.Schema.Types.Mixed, default: null },
    schemaVersion: { type: Number, default: 1 },
  },
  {
    timestamps: true,
    minimize: false,
    toJSON: cleanJSON((ret) => {
      ret.userId = String(ret.owner);
      delete ret.owner;
    }),
  },
);

tripSchema.index({ owner: 1, createdAt: -1 });

export const Trip = mongoose.models.Trip ?? mongoose.model('Trip', tripSchema);
export default Trip;
