import express from 'express';
import { LoginSchema, RegisterSchema } from '@tripplanner/shared';
import { authController } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validate.js';

const router = express.Router();

router.post('/register', authLimiter, validateBody(RegisterSchema), authController.register);
router.post('/login', authLimiter, validateBody(LoginSchema), authController.login);
router.post('/demo', authLimiter, authController.demo);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;
