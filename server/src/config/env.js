/**
 * Central configuration.
 *
 * Why this file exists: ES modules run all their imports BEFORE the importing
 * file's own code. The old server.js called dotenv.config() after importing
 * app.js, so modules like the auth / rate-limit setup read process.env too early
 * and never saw the .env values. Now every module imports `config` from here,
 * and this module loads .env first, so the order can never break again.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Load server/.env no matter which folder the process was started from.
dotenv.config({ path: path.join(serverRoot, '.env') });

// Values copied from .env.example ("your_gemini_api_key", "sk_test_demo_key" ...) count as "not set".
const isPlaceholder = (value) =>
  !value || /^your[_-]/i.test(value) || /_demo_key$/i.test(value) || /^(changeme|xxx+)$/i.test(value);

const secret = z
  .string()
  .trim()
  .optional()
  .transform((value) => (isPlaceholder(value) ? '' : value));

const DEV_JWT_SECRET = 'dev-only-secret-do-not-use-in-production-0123456789';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    CLIENT_URL: z.string().trim().default('http://localhost:5173'),
    TRUST_PROXY: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),

    // Database — MongoDB Atlas (see docs/SETUP_MONGODB.md) or a local MongoDB
    MONGODB_URI: z.string().trim().default(''),

    // Login (JWT in an httpOnly cookie)
    JWT_SECRET: z.string().trim().default(''),
    JWT_EXPIRES_DAYS: z.coerce.number().int().min(1).max(90).default(7),
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    COOKIE_SECURE: z.enum(['auto', 'true', 'false']).default('auto'),
    DEMO_LOGIN_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),

    // AI
    GEMINI_API_KEY: secret,
    GEMINI_MODEL: z.string().trim().min(1).default('gemini-3.8-flash'),

    // Places (optional)
    GOOGLE_PLACES_API_KEY: secret,

    // Rate limiting
    RATE_LIMIT_WINDOW_MIN: z.coerce.number().positive().default(15),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    AI_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(10),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.JWT_SECRET.length < 32) {
      ctx.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'must be at least 32 random characters in production' });
    }
    if (env.COOKIE_SAMESITE === 'none' && env.COOKIE_SECURE === 'false') {
      ctx.addIssue({ code: 'custom', path: ['COOKIE_SECURE'], message: 'must be true when COOKIE_SAMESITE=none (browsers require it)' });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n[Config] Invalid environment variables in server/.env:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('Fix them (see server/.env.example) and restart.\n');
  process.exit(1);
}

const env = parsed.data;
const isProd = env.NODE_ENV === 'production';

export const config = Object.freeze({
  env: env.NODE_ENV,
  isProd,
  isDev: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  clientUrls: env.CLIENT_URL.split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean),
  trustProxy: env.TRUST_PROXY,
  mongoUri: env.MONGODB_URI,
  auth: Object.freeze({
    jwtSecret: env.JWT_SECRET || DEV_JWT_SECRET,
    usingDevSecret: !env.JWT_SECRET,
    expiresDays: env.JWT_EXPIRES_DAYS,
    cookieName: 'tp_session',
    cookieSameSite: env.COOKIE_SAMESITE,
    cookieSecure: env.COOKIE_SECURE === 'auto' ? isProd : env.COOKIE_SECURE === 'true',
    demoLoginEnabled: env.DEMO_LOGIN_ENABLED,
  }),
  gemini: Object.freeze({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL }),
  googlePlacesKey: env.GOOGLE_PLACES_API_KEY,
  rateLimit: Object.freeze({
    windowMs: env.RATE_LIMIT_WINDOW_MIN * 60 * 1000,
    max: env.RATE_LIMIT_MAX,
    aiPerMinute: env.AI_RATE_LIMIT_PER_MIN,
    authMax: env.AUTH_RATE_LIMIT_MAX,
  }),
});

/** Which optional integrations are configured (shown on /api/health and the Profile page). */
export const serviceStatus = () => ({
  geminiAI: Boolean(config.gemini.apiKey),
  googlePlaces: Boolean(config.googlePlacesKey),
  demoLogin: config.auth.demoLoginEnabled,
});
