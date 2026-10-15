import { z } from 'zod';
import { ACTIVITY_CATEGORIES, BUDGET_TIER_VALUES, CURRENCY, ITINERARY_SOURCES, LIMITS, LOCATION_SOURCES, ROUTE_PROVIDERS } from '../constants.js';
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
const locationSource = z.enum(LOCATION_SOURCES).optional().catch(undefined);
const latLng = z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]);

/** One day's route between its stops (Part 8). Filled by the server's map service, never by the AI. */
export const DayRouteSchema = z.object({
  provider: z.enum(ROUTE_PROVIDERS),
  distanceKm: z.number().min(0).catch(0),
  durationMin: z.number().min(0).catch(0),
  // activity ids of the stops, in order; legs[i] goes from stopIds[i] to stopIds[i + 1]
  stopIds: z.array(z.string().max(40)).max(30).catch([]),
  legs: z.array(z.object({ distanceKm: z.number().min(0), durationMin: z.number().min(0) })).max(30).catch([]),
  geometry: z.array(latLng).max(LIMITS.MAX_ROUTE_POINTS).catch([]),
  // fingerprint of the stops the route was made for; a changed day gets a new route
  signature: z.string().max(40),
});

/** Summary of the last map update (Part 8). */
export const MapInfoSchema = z.object({
  version: z.number().int(),
  updatedAt: z.string().max(40),
  located: z.number().int().min(0),
  total: z.number().int().min(0),
  notice: z.string().max(300).optional(),
});

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
  locationSource,
});

export const DaySchema = z.object({
  id: z.string().optional(),
  dayNumber: z.coerce.number().int().min(1),
  date: z.string().refine(isValidIsoDate).optional().catch(undefined),
  title: z.string().trim().min(1).max(120).catch('Day plan'),
  description: shortText(500).default(''),
  estimatedDailyExpense: money.default(0),
  activities: z.array(ActivitySchema).min(1, 'Every day needs at least one activity.').max(15),
  route: DayRouteSchema.optional().catch(undefined),
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
  locationSource,
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
  locationSource,
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
  /** Which AI model wrote it (gemini only) and when. */
  model: z.string().trim().max(60).optional().catch(undefined),
  generatedAt: z.string().trim().max(40).optional().catch(undefined),
  // Filled by later parts. Optional, so trips saved before those parts stay valid.
  map: MapInfoSchema.optional().catch(undefined), // Part 8 (routes live on each day)
  // Part 11: weather, packing list and "how to reach" are NOT stored here — they change with the dates
  // and the starting city, so they are worked out fresh when the trip is opened.
});
