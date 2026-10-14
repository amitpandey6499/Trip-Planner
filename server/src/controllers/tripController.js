import { randomUUID } from 'node:crypto';
import { calcDuration, normalizeItinerary, ItineraryError } from '@tripplanner/shared';
import { generateItinerary } from '../services/aiService.js';
import db from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80';

/**
 * Request bodies are already validated by the shared Zod schemas (see routes/tripRoutes.js),
 * so controllers only contain business logic.
 */
export const tripController = {
  // POST /api/trips/generate   body: TripPreferences
  generate: asyncHandler(async (req, res) => {
    const preferences = req.body;
    const itinerary = await generateItinerary(preferences);
    res.status(200).json({ success: true, data: itinerary, preferences });
  }),

  // POST /api/trips   body: { tripData, itinerary }
  save: asyncHandler(async (req, res) => {
    const { tripData, itinerary: rawItinerary } = req.body;

    // Updating an existing trip is only allowed for its owner.
    if (tripData.id) {
      const existing = await db.getTripById(tripData.id);
      if (existing && existing.userId !== req.user.id) throw ApiError.forbidden('This trip belongs to another user.');
    }

    const durationDays = calcDuration(tripData.startDate, tripData.endDate);
    const facts = {
      destination: tripData.destination,
      startDate: tripData.startDate,
      endDate: tripData.endDate,
      durationDays,
      travelersCount: tripData.travelersCount,
      totalBudget: tripData.totalBudget,
      budgetCategory: tripData.budgetCategory,
    };

    let itinerary = null;
    if (rawItinerary !== undefined && rawItinerary !== null) {
      try {
        itinerary = normalizeItinerary(rawItinerary, facts);
      } catch (err) {
        if (err instanceof ItineraryError) throw ApiError.badRequest(err.message, { field: 'itinerary', fields: err.details });
        throw err;
      }
    }

    const trip = {
      id: tripData.id || `trip_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      userId: req.user.id,
      title: tripData.title || itinerary?.title || `${tripData.destination} Trip`,
      ...facts,
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

  // PUT /api/trips/:id   body: UpdateTrip (only whitelisted fields reach here)
  update: asyncHandler(async (req, res) => {
    const changes = { ...req.body };
    const existing = await db.getTripById(req.params.id, req.user.id);
    if (!existing) throw ApiError.notFound('Trip not found.');

    // Keep dates consistent when only one of them changes.
    const startDate = changes.startDate ?? existing.startDate;
    const endDate = changes.endDate ?? existing.endDate;
    if (changes.startDate || changes.endDate) {
      if (endDate < startDate) throw ApiError.badRequest('End date cannot be before start date.', { field: 'endDate' });
      changes.durationDays = calcDuration(startDate, endDate);
    }

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
