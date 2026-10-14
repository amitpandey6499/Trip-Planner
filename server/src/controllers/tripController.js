import { randomUUID } from 'node:crypto';
import { generateItinerary } from '../services/aiService.js';
import db from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseIntOr, clamp } from '../utils/numbers.js';

const MAX_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80';

/** Fields a user is allowed to change with PUT /api/trips/:id (everything else is ignored). */
const UPDATABLE_FIELDS = ['title', 'status', 'startDate', 'endDate', 'travelersCount', 'totalBudget', 'budgetCategory'];

const isIsoDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

/**
 * Basic input checks until Part 2 moves validation into shared Zod schemas.
 * Throws ApiError(400) with a clear message instead of letting NaN / bad dates through.
 */
const validatePreferences = (body) => {
  const destination = typeof body.destination === 'string' ? body.destination.trim() : '';
  if (!destination) throw ApiError.badRequest('Destination is required.', { field: 'destination' });

  const { startDate, endDate } = body;
  if (startDate && !isIsoDate(startDate)) throw ApiError.badRequest('Start date must be YYYY-MM-DD.', { field: 'startDate' });
  if (endDate && !isIsoDate(endDate)) throw ApiError.badRequest('End date must be YYYY-MM-DD.', { field: 'endDate' });

  let durationDays = parseIntOr(body.durationDays, undefined);
  if (startDate && endDate) {
    const diff = (Date.parse(endDate) - Date.parse(startDate)) / DAY_MS;
    if (diff < 0) throw ApiError.badRequest('End date cannot be before start date.', { field: 'endDate' });
    durationDays = Math.round(diff) + 1;
  }
  durationDays = durationDays ?? 3;
  if (Number.isNaN(durationDays) || durationDays < 1) {
    throw ApiError.badRequest('Duration must be at least 1 day.', { field: 'durationDays' });
  }
  if (durationDays > MAX_DAYS) {
    throw ApiError.badRequest(`Trips can be at most ${MAX_DAYS} days long.`, { field: 'durationDays' });
  }

  const totalBudget = parseIntOr(body.totalBudget, 15000);
  if (Number.isNaN(totalBudget) || totalBudget < 1000) {
    throw ApiError.badRequest('Budget must be a number of at least ₹1,000.', { field: 'totalBudget' });
  }

  const travelersCount = parseIntOr(body.travelersCount, 2);
  if (Number.isNaN(travelersCount) || travelersCount < 1 || travelersCount > 20) {
    throw ApiError.badRequest('Travelers must be between 1 and 20.', { field: 'travelersCount' });
  }

  const start = startDate || new Date().toISOString().slice(0, 10);
  const end = endDate || new Date(Date.parse(start) + (durationDays - 1) * DAY_MS).toISOString().slice(0, 10);

  return {
    destination,
    startDate: start,
    endDate: end,
    durationDays,
    totalBudget,
    budgetCategory: ['Budget', 'Moderate', 'Luxury'].includes(body.budgetCategory) ? body.budgetCategory : 'Moderate',
    travelersCount,
    interests: Array.isArray(body.interests) ? body.interests.filter((i) => typeof i === 'string').slice(0, 12) : [],
    travelStyle: typeof body.travelStyle === 'string' ? body.travelStyle : 'Balanced',
    accommodationType: typeof body.accommodationType === 'string' ? body.accommodationType : 'Mid-Range Hotel',
    dietaryPreference: typeof body.dietaryPreference === 'string' ? body.dietaryPreference : 'No Restrictions',
    specialNotes: typeof body.specialNotes === 'string' ? body.specialNotes.slice(0, 500) : '',
  };
};

export const tripController = {
  // POST /api/trips/generate
  generate: asyncHandler(async (req, res) => {
    const preferences = validatePreferences(req.body ?? {});
    const itinerary = await generateItinerary(preferences);
    res.status(200).json({ success: true, data: itinerary, preferences });
  }),

  // POST /api/trips  (save)
  save: asyncHandler(async (req, res) => {
    const { tripData, itinerary } = req.body ?? {};
    if (!tripData || typeof tripData.destination !== 'string' || !tripData.destination.trim()) {
      throw ApiError.badRequest('Trip data and destination are required.');
    }

    // Updating an existing trip is only allowed for its owner.
    if (tripData.id) {
      const existing = await db.getTripById(tripData.id);
      if (existing && existing.userId !== req.user.id) throw ApiError.forbidden('This trip belongs to another user.');
    }

    const totalBudget = parseIntOr(tripData.totalBudget, itinerary?.budgetBreakdown?.totalEstimated ?? 15000);
    const travelersCount = parseIntOr(tripData.travelersCount, 2);
    const durationDays = parseIntOr(tripData.durationDays, itinerary?.days?.length ?? 1);

    const trip = {
      id: tripData.id || `trip_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      userId: req.user.id,
      destination: tripData.destination.trim(),
      title: (tripData.title || `${tripData.destination.trim()} Trip`).slice(0, 120),
      startDate: isIsoDate(tripData.startDate) ? tripData.startDate : new Date().toISOString().slice(0, 10),
      endDate: isIsoDate(tripData.endDate) ? tripData.endDate : null,
      durationDays: Number.isNaN(durationDays) ? 1 : clamp(durationDays, 1, MAX_DAYS),
      travelersCount: Number.isNaN(travelersCount) ? 2 : clamp(travelersCount, 1, 20),
      totalBudget: Number.isNaN(totalBudget) ? 15000 : Math.max(totalBudget, 0),
      budgetCategory: ['Budget', 'Moderate', 'Luxury'].includes(tripData.budgetCategory) ? tripData.budgetCategory : 'Moderate',
      status: tripData.status || 'Upcoming',
      destinationImage: tripData.destinationImage || itinerary?.destinationImage || DEFAULT_IMAGE,
    };

    await db.saveTrip(trip, itinerary);
    res.status(201).json({ success: true, message: 'Trip saved successfully', data: trip });
  }),

  // GET /api/trips
  getAll: asyncHandler(async (req, res) => {
    const trips = await db.getTripsByUser(req.user.id);
    res.status(200).json({ success: true, count: trips.length, data: trips });
  }),

  // GET /api/trips/:id
  getById: asyncHandler(async (req, res) => {
    const trip = await db.getTripById(req.params.id, req.user?.id ?? null);
    if (!trip) throw ApiError.notFound('Trip not found.');
    res.status(200).json({ success: true, data: trip });
  }),

  // PUT /api/trips/:id
  update: asyncHandler(async (req, res) => {
    const changes = {};
    for (const field of UPDATABLE_FIELDS) {
      if (req.body?.[field] !== undefined) changes[field] = req.body[field];
    }
    if (Object.keys(changes).length === 0) throw ApiError.badRequest('Nothing to update.');

    const updated = await db.updateTrip(req.params.id, changes, req.user.id);
    if (!updated) throw ApiError.notFound('Trip not found.');
    res.status(200).json({ success: true, message: 'Trip updated successfully', data: updated });
  }),

  // DELETE /api/trips/:id
  remove: asyncHandler(async (req, res) => {
    const deleted = await db.deleteTrip(req.params.id, req.user.id);
    if (!deleted) throw ApiError.notFound('Trip not found.');
    res.status(200).json({ success: true, message: 'Trip deleted successfully' });
  }),
};
