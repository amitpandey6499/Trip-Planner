import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

const jsonMessage = (error) => ({ success: false, error });

/** Applied to every /api route. */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => config.isTest,
  message: jsonMessage('Too many requests. Please wait a few minutes and try again.'),
});

/** Stricter limit for AI generation (it costs API quota). */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: config.rateLimit.aiPerMinute,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => config.isTest,
  message: jsonMessage('AI generation limit reached. Please wait a minute before generating again.'),
});

/** Login / register: slows down password guessing. Counted per IP + email. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.rateLimit.authMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => config.isTest,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}|${String(req.body?.email ?? '').toLowerCase()}`,
  message: jsonMessage('Too many login attempts. Please wait 15 minutes and try again.'),
});

/** Map updates (place lookup + routes): mostly cached, but each one can take a while. */
export const mapLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: config.rateLimit.mapPerMinute,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => config.isTest,
  message: jsonMessage('Too many map updates. Please wait a minute and try again.'),
});
