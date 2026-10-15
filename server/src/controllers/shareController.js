import { ItineraryError, normalizeItinerary } from '@tripplanner/shared';
import { pdfFileName, renderTripPdf } from '../services/export/tripPdf.js';
import { copySharedTrip, getShareInfo, getSharedForExport, getSharedTrip, ownShareUrl, setSharing } from '../services/shareService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Part 14 — share links, "save a copy", PDF export. */

const normalizeOrReject = (raw) => {
  try {
    return normalizeItinerary(raw, {});
  } catch (err) {
    if (err instanceof ItineraryError) throw ApiError.badRequest(err.message, { field: 'itinerary', fields: err.details });
    throw err;
  }
};

const sendPdf = (res, buffer, title) => {
  res.attachment(pdfFileName(title));
  res.type('application/pdf');
  res.set('Cache-Control', 'private, no-store');
  res.send(buffer);
};

export const shareController = {
  // GET /api/trips/:id/share
  getShare: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await getShareInfo(req.params.id, req.user.id) });
  }),

  // PUT /api/trips/:id/share   body: { enabled, newLink? }
  setShare: asyncHandler(async (req, res) => {
    const data = await setSharing(req.params.id, req.user.id, req.body);
    res.json({ success: true, message: data.enabled ? 'Share link is on.' : 'Share link is off.', data });
  }),

  // GET /api/share/:slug   (no login needed)
  shared: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await getSharedTrip(req.params.slug, req.user) });
  }),

  // POST /api/share/:slug/copy   (login needed)
  copy: asyncHandler(async (req, res) => {
    const data = await copySharedTrip(req.params.slug, req.user.id);
    res.status(201).json({ success: true, message: 'A copy was saved to your trips.', data });
  }),

  // GET /api/share/:slug/pdf   (no login needed)
  sharedPdf: asyncHandler(async (req, res) => {
    const { itinerary, url, sharedBy } = await getSharedForExport(req.params.slug);
    const plan = normalizeOrReject(itinerary);
    sendPdf(res, await renderTripPdf(plan, { shareUrl: url, sharedBy }), plan.title);
  }),

  // POST /api/trips/pdf   body: { itinerary, tripId? } — the plan on screen, saved or not
  tripPdf: asyncHandler(async (req, res) => {
    const plan = normalizeOrReject(req.body.itinerary);
    const shareUrl = await ownShareUrl(req.body.tripId, req.user.id);
    sendPdf(res, await renderTripPdf(plan, { shareUrl }), plan.title);
  }),
};
