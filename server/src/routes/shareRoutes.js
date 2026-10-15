import express from 'express';
import { shareController as c } from '../controllers/shareController.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { exportLimiter } from '../middleware/rateLimiter.js';

/** Part 14 — public share pages: /api/share/:slug (read-only), its PDF, and "save a copy" (login). */
const router = express.Router();

router.get('/:slug', optionalAuth, c.shared);
router.get('/:slug/pdf', exportLimiter, c.sharedPdf);
router.post('/:slug/copy', requireAuth, c.copy);

export default router;
