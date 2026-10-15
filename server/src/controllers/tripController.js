import { generateItinerary, regenerateDay } from '../services/aiService.js';
import * as trips from '../services/tripService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { respondWithProgress } from '../utils/stream.js';

/**
 * Thin controllers: bodies are already validated by shared schemas (routes/tripRoutes.js),
 * database rules (ownership, normalization) live in services/tripService.js.
 */
export const tripController = {
  // POST /api/trips/generate   body: TripPreferences
  // ?fresh=1 skips the AI cache (used by the "Regenerate" button)
  // Accept: text/event-stream → events: progress, day (each day as soon as it is written), reset, result | error
  generate: asyncHandler(async (req, res) => {
    const preferences = req.body;
    await respondWithProgress(req, res, async ({ streaming, onProgress, emit, signal }) => {
      const { itinerary, meta } = await generateItinerary(preferences, {
        userId: req.user.id,
        fresh: req.query.fresh === '1',
        ...(streaming && {
          onProgress,
          onDay: (day) => emit('day', day),
          onReset: () => emit('reset', {}),
          signal,
        }),
      });
      return { data: itinerary, preferences, meta };
    });
  }),

  // POST /api/trips/regenerate-day   body: { preferences, itinerary, dayNumber, pace?, note? }
  regenerateDay: asyncHandler(async (req, res) => {
    const { preferences, itinerary, dayNumber, pace, note } = req.body;
    const result = await regenerateDay(preferences, itinerary, dayNumber, { pace, note, userId: req.user.id });
    res.status(200).json({ success: true, data: result.itinerary, meta: result.meta });
  }),

  // POST /api/trips   body: { tripData, preferences?, itinerary? }
  save: asyncHandler(async (req, res) => {
    const { trip, created } = await trips.saveTrip(req.user.id, req.body);
    res.status(created ? 201 : 200).json({ success: true, message: created ? 'Trip saved successfully' : 'Trip updated', data: trip });
  }),

  // GET /api/trips
  getAll: asyncHandler(async (req, res) => {
    const list = await trips.listTrips(req.user.id);
    res.status(200).json({ success: true, count: list.length, data: list });
  }),

  // GET /api/trips/:id
  getById: asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await trips.getTrip(req.params.id, req.user.id) });
  }),

  // PUT /api/trips/:id
  update: asyncHandler(async (req, res) => {
    const updated = await trips.updateTrip(req.params.id, req.user.id, req.body);
    res.status(200).json({ success: true, message: 'Trip updated successfully', data: updated });
  }),

  // DELETE /api/trips/:id
  remove: asyncHandler(async (req, res) => {
    await trips.deleteTrip(req.params.id, req.user.id);
    res.status(200).json({ success: true, message: 'Trip deleted successfully' });
  }),
};
