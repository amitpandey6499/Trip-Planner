import express from 'express';
import { SaveTripSchema, TripPreferencesSchema, UpdateTripSchema } from '@tripplanner/shared';
import { tripController } from '../controllers/tripController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validate.js';

const router = express.Router();

router.post('/generate', aiLimiter, optionalAuth, validateBody(TripPreferencesSchema), tripController.generate);
router.post('/', requireAuth, validateBody(SaveTripSchema), tripController.save);
router.get('/', requireAuth, tripController.getAll);
router.get('/:id', optionalAuth, tripController.getById);
router.put('/:id', requireAuth, validateBody(UpdateTripSchema), tripController.update);
router.delete('/:id', requireAuth, tripController.remove);

export default router;
