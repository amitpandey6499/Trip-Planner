import express from 'express';
import { tripController } from '../controllers/tripController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/generate', aiLimiter, optionalAuth, tripController.generate);
router.post('/', requireAuth, tripController.save);
router.get('/', requireAuth, tripController.getAll);
router.get('/:id', optionalAuth, tripController.getById);
router.put('/:id', requireAuth, tripController.update);
router.delete('/:id', requireAuth, tripController.remove);

export default router;
