import express from 'express';
import { MapEnrichSchema } from '@tripplanner/shared';
import { mapController } from '../controllers/mapController.js';
import { requireAuth } from '../middleware/auth.js';
import { mapLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validate.js';

const router = express.Router();

router.post('/enrich', requireAuth, mapLimiter, validateBody(MapEnrichSchema), mapController.enrich);

export default router;
