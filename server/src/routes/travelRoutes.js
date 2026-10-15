import express from 'express';
import { ReachQuery, WeatherQuery } from '@tripplanner/shared';
import { travelController } from '../controllers/travelController.js';
import { mapLimiter } from '../middleware/rateLimiter.js';
import { validateQuery } from '../middleware/validateQuery.js';

/** Part 11 routes (public: the destination page uses them too). Outside services → limited per IP. */
const router = express.Router();
router.get('/weather', mapLimiter, validateQuery(WeatherQuery), travelController.weather);
router.get('/reach', mapLimiter, validateQuery(ReachQuery), travelController.reach);
export default router;
