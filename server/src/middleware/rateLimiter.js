import aj from '../config/arcjet.js';
import rateLimit from 'express-rate-limit';

// Fallback standard rate limiter for all general routes
const expressLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // limit each IP to 150 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

// Stricter rate limiter for AI generation endpoint
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // max 10 trip generation requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'AI generation rate limit reached. Please wait a moment before generating another trip.'
  }
});

// Middleware combining Arcjet with Express Rate Limiter
export const rateLimiterMiddleware = async (req, res, next) => {
  if (aj) {
    try {
      const decision = await aj.protect(req, { requested: 1 });
      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          return res.status(429).json({ success: false, error: 'Rate limit exceeded. Please slow down.' });
        } else if (decision.reason.isBot()) {
          return res.status(403).json({ success: false, error: 'Automated bot access forbidden.' });
        } else {
          return res.status(403).json({ success: false, error: 'Access denied by security shield.' });
        }
      }
      return next();
    } catch (err) {
      console.warn('Arcjet decision error, passing to standard limiter:', err.message);
    }
  }

  // Fallback
  return expressLimiter(req, res, next);
};
