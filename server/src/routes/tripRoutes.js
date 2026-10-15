import express from 'express';
import { RegenerateDaySchema, SaveTripSchema, SavedTripMapSchema, TripPreferencesSchema, UpdateTripSchema } from '@tripplanner/shared';
import { mapController } from '../controllers/mapController.js';
import { tripController } from '../controllers/tripController.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter, mapLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validate.js';

const router = express.Router();

// Every trip route needs a logged-in user (generation uses AI quota, Part 6 adds a per-user limit).
router.use(requireAuth);

// Accept: text/event-stream → live progress + days as they are written (Part 9); otherwise one JSON answer.
router.post('/generate', aiLimiter, validateBody(TripPreferencesSchema), tripController.generate);
router.post('/regenerate-day', aiLimiter, validateBody(RegenerateDaySchema), tripController.regenerateDay);
router.post('/', validateBody(SaveTripSchema), tripController.save);
router.get('/', tripController.getAll);
router.get('/:id', tripController.getById);
router.put('/:id', validateBody(UpdateTripSchema), tripController.update);
router.delete('/:id', tripController.remove);
router.post('/:id/map', mapLimiter, validateBody(SavedTripMapSchema), mapController.tripMap);

export default router;
