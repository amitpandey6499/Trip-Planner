import express from 'express';
import rateLimit from 'express-rate-limit';
import { ContactSchema } from '@tripplanner/shared';
import { config } from '../config/env.js';
import { contactController } from '../controllers/contactController.js';
import { optionalAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = express.Router();

// Contact form is public: keep spam down.
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => config.isTest,
  message: { success: false, error: 'Too many messages. Please try again later.' },
});

router.post('/', contactLimiter, optionalAuth, validateBody(ContactSchema), contactController.create);

export default router;
