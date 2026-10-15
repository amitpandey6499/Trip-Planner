import { ItineraryError, normalizeItinerary } from '@tripplanner/shared';
import { enrichItinerary } from '../services/geo/mapService.js';
import { updateTripMap } from '../services/tripService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { respondWithProgress } from '../utils/stream.js';

/**
 * Part 8 — map updates (place positions + road routes).
 * Both answer as a live event stream (Accept: text/event-stream) or as plain JSON.
 */
export const mapController = {
  // POST /api/map/enrich   body: { itinerary, force? }  → an itinerary that is not saved (yet)
  enrich: asyncHandler(async (req, res) => {
    let itinerary;
    try {
      itinerary = normalizeItinerary(req.body.itinerary);
    } catch (err) {
      if (err instanceof ItineraryError) throw ApiError.badRequest(err.message, { field: 'itinerary', fields: err.details });
      throw err;
    }
    await respondWithProgress(req, res, async ({ onProgress, signal }) => {
      const { itinerary: data, stats } = await enrichItinerary(itinerary, { force: req.body.force, onProgress, signal });
      return { data, stats };
    });
  }),

  // POST /api/trips/:id/map   body: { force? }  → a saved trip; the result is stored with the trip
  tripMap: asyncHandler(async (req, res) => {
    await respondWithProgress(req, res, async ({ onProgress, signal }) => {
      const { trip, stats, stale } = await updateTripMap(req.params.id, req.user.id, (itinerary) =>
        enrichItinerary(itinerary, { force: req.body.force, onProgress, signal }),
      );
      return { data: trip, stats, stale };
    });
  }),
};
