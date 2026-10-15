import express from 'express';
import { RegenerateDaySchema, SaveTripSchema, SavedTripMapSchema, ShareSettingsSchema, TripPdfSchema, TripPreferencesSchema, UpdateTripSchema } from '@tripplanner/shared';
import { mapController } from '../controllers/mapController.js';
import { shareController } from '../controllers/shareController.js';
import { tripController } from '../controllers/tripController.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter, exportLimiter, mapLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validate.js';

const router = express.Router();

// Every trip route needs a logged-in user (generation uses AI quota, Part 6 adds a per-user limit).
router.use(requireAuth);

// Accept: text/event-stream → live progress + days as they are written (Part 9); otherwise one JSON answer.
router.post('/generate', aiLimiter, validateBody(TripPreferencesSchema), tripController.generate);
router.post('/regenerate-day', aiLimiter, validateBody(RegenerateDaySchema), tripController.regenerateDay);
router.post('/pdf', exportLimiter, validateBody(TripPdfSchema), shareController.tripPdf); // Part 14: PDF of the plan on screen
router.post('/', validateBody(SaveTripSchema), tripController.save);
router.get('/', tripController.getAll);
router.get('/:id', tripController.getById);
router.put('/:id', validateBody(UpdateTripSchema), tripController.update);
router.delete('/:id', tripController.remove);
router.post('/:id/map', mapLimiter, validateBody(SavedTripMapSchema), mapController.tripMap);
router.get('/:id/share', shareController.getShare);
router.put('/:id/share', validateBody(ShareSettingsSchema), shareController.setShare);

export default router;
