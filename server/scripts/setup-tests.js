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
// Map services are never called for real in tests: they get a fake fetch (test/map.test.js).
process.env.MAP_ENABLED = 'true';
process.env.NOMINATIM_URL = 'http://nominatim.test';
process.env.OSRM_URL = 'http://osrm.test';
process.env.NOMINATIM_EMAIL = '';
// Part 10 / 11 outside services: fake fetch in tests too.
process.env.PHOTOS_ENABLED = 'true';
process.env.WIKIPEDIA_API_URL = 'http://wikipedia.test/w/api.php';
process.env.WEATHER_ENABLED = 'true';
process.env.OPEN_METEO_URL = 'http://open-meteo.test';
process.env.OPEN_METEO_ARCHIVE_URL = 'http://archive.open-meteo.test';
