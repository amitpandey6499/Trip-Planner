import express from 'express';
import { tripController } from '../controllers/tripController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Generate trip itinerary (AI endpoint with rate limiter and optional auth)
router.post('/generate', aiRateLimiter, optionalAuth, tripController.generate);

// Save trip (Protected)
router.post('/', requireAuth, tripController.save);

// Get all trips for current user (Protected)
router.get('/', requireAuth, tripController.getAll);

// Get trip by ID
router.get('/:id', optionalAuth, tripController.getById);

// Update trip by ID (Protected)
router.put('/:id', requireAuth, tripController.update);

// Delete trip by ID (Protected)
router.delete('/:id', requireAuth, tripController.delete);

export default router;
