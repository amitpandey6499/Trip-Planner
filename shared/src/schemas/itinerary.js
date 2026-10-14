import { z } from 'zod';
import { ACTIVITY_CATEGORIES, BUDGET_TIER_VALUES, CURRENCY, ITINERARY_SOURCES, LIMITS } from '../constants.js';
import { isValidIsoDate } from '../utils/dates.js';
import { CoordinatesSchema, money, optionalUrl } from './common.js';

/**
 * The itinerary contract — produced by the AI / sample generator, stored with a trip,
 * and rendered by the client.
 *
 * It is deliberately TOLERANT on details (a bad cost becomes 0, a bad image URL or
 * coordinate is dropped) but STRICT on structure (days, activities, names), so one
 * small AI mistake never crashes a page, while a broken answer is rejected.
 *
 * Money: whole rupees, total for the whole group (see docs/CONTRACTS.md).
 */

const shortText = (max) => z.string().trim().max(max).catch('');
const optionalShortText = (max) => z.string().trim().max(max).optional().catch(undefined);
const rating = z.coerce.number().min(0).max(5).optional().catch(undefined);
const coordinates = CoordinatesSchema.optional().catch(undefined);
const tagList = z.array(z.string().trim().min(1).max(60)).max(12).catch([]);

export const ActivitySchema = z.object({
  id: z.string().optional(),
  placeName: z.string({ error: 'Each activity needs a place name.' }).trim().min(1, 'Each activity needs a place name.').max(120),
  timeSlot: shortText(40).default(''),
  category: z.enum(ACTIVITY_CATEGORIES).catch('Attraction'),
  estimatedDuration: optionalShortText(40),
  description: shortText(1000).default(''),
  imageUrl: optionalUrl,
  cost: money.default(0),
  tips: optionalShortText(500),
  coordinates,
});

export const DaySchema = z.object({
  id: z.string().optional(),
  dayNumber: z.coerce.number().int().min(1),
  date: z.string().refine(isValidIsoDate).optional().catch(undefined),
  title: z.string().trim().min(1).max(120).catch('Day plan'),
  description: shortText(500).default(''),
  estimatedDailyExpense: money.default(0),
  activities: z.array(ActivitySchema).min(1, 'Every day needs at least one activity.').max(15),
});

export const HotelSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  rating,
  pricePerNight: money.default(0),
  currency: z.literal(CURRENCY).catch(CURRENCY),
  budgetTier: z.enum(BUDGET_TIER_VALUES).catch('Moderate'),
  amenities: tagList.default([]),
  address: optionalShortText(200),
  imageUrl: optionalUrl,
  distance: optionalShortText(80),
  coordinates,
});

export const RestaurantSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  rating,
  cuisine: optionalShortText(120),
  costForTwo: money.default(0),
  currency: z.literal(CURRENCY).catch(CURRENCY),
  dietaryTags: tagList.default([]),
  address: optionalShortText(200),
  imageUrl: optionalUrl,
  distance: optionalShortText(80),
  coordinates,
});

export const BudgetBreakdownSchema = z.object({
  accommodation: money.default(0),
  activitiesAndSightseeing: money.default(0),
  foodAndDining: money.default(0),
  localTransport: money.default(0),
  totalEstimated: money.default(0),
  currency: z.literal(CURRENCY).catch(CURRENCY),
});

export const ITINERARY_SCHEMA_VERSION = 1;

export const ItinerarySchema = z.object({
  schemaVersion: z.literal(ITINERARY_SCHEMA_VERSION).catch(ITINERARY_SCHEMA_VERSION),
  source: z.enum(Object.keys(ITINERARY_SOURCES)).catch('offline'),
  destination: z.string().trim().min(1).max(LIMITS.MAX_DESTINATION_LENGTH),
  title: z.string().trim().min(1).max(LIMITS.MAX_TITLE_LENGTH),
  summary: shortText(1000).default(''),
  destinationImage: optionalUrl,
  startDate: z.string().refine(isValidIsoDate).optional().catch(undefined),
  endDate: z.string().refine(isValidIsoDate).optional().catch(undefined),
  durationDays: z.coerce.number().int().min(1).max(LIMITS.MAX_TRIP_DAYS),
  travelersCount: z.coerce.number().int().min(1).max(LIMITS.MAX_TRAVELERS).catch(1),
  budgetCategory: z.enum(BUDGET_TIER_VALUES).catch('Moderate'),
  /** What the user said they can spend. */
  totalBudget: money.default(0),
  /** What this plan is estimated to cost (= budgetBreakdown.totalEstimated). */
  estimatedTotal: money.default(0),
  withinBudget: z.boolean().default(true),
  currency: z.literal(CURRENCY).catch(CURRENCY),
  budgetBreakdown: BudgetBreakdownSchema,
  days: z.array(DaySchema).min(1, 'An itinerary needs at least one day.').max(LIMITS.MAX_TRIP_DAYS),
  hotels: z.array(HotelSchema).max(12).catch([]).default([]),
  restaurants: z.array(RestaurantSchema).max(12).catch([]).default([]),
  // Filled by later parts. Optional, so trips saved before those parts stay valid.
  routes: z.array(z.unknown()).optional(), // Part 8
  weather: z.array(z.unknown()).optional(), // Part 11
  packingList: z.array(z.unknown()).optional(), // Part 11
  transportOptions: z.array(z.unknown()).optional(), // Part 11
});
