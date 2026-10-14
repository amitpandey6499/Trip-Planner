/**
 * Loaded before every test file (see "test" script in package.json).
 * Sets a safe environment BEFORE src/config/env.js reads it:
 * no real AI calls and never the real database (tests use scripts/test-db.js).
 */
process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = '';
process.env.GOOGLE_PLACES_API_KEY = '';
process.env.MONGODB_URI = '';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-0123456789';
process.env.DEMO_LOGIN_ENABLED = 'true';
process.env.AI_DAILY_LIMIT = '3';
process.env.AI_CACHE_DAYS = '7';
