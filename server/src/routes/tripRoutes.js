import express from 'express';
import { SaveTripSchema, TripPreferencesSchema, UpdateTripSchema } from '@tripplanner/shared';
import { tripController } from '../controllers/tripController.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validate.js';

const router = express.Router();

// Every trip route needs a logged-in user (generation uses AI quota, Part 6 adds a per-user limit).
router.use(requireAuth);

router.post('/generate', aiLimiter, validateBody(TripPreferencesSchema), tripController.generate);
router.post('/', validateBody(SaveTripSchema), tripController.save);
router.get('/', tripController.getAll);
router.get('/:id', tripController.getById);
router.put('/:id', validateBody(UpdateTripSchema), tripController.update);
router.delete('/:id', tripController.remove);

export default router;
