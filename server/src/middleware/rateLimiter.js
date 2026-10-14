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
