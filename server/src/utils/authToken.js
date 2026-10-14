import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Login session = a signed JWT stored in an httpOnly cookie.
 * httpOnly → page JavaScript (and XSS) cannot read it; the browser sends it automatically.
 *
 * rememberMe = true  → token + cookie last JWT_EXPIRES_DAYS (default 7)
 * rememberMe = false → token lasts 1 day, cookie is deleted when the browser closes
 */
export const signSession = (userId, { rememberMe = true } = {}) =>
  jwt.sign({ sub: String(userId) }, config.auth.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: rememberMe ? `${config.auth.expiresDays}d` : '1d',
  });

/** Returns the user id, or null for a missing / invalid / expired token. */
export const verifySession = (token) => {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.auth.jwtSecret, { algorithms: ['HS256'] });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
};

const baseCookie = () => ({
  httpOnly: true,
  secure: config.auth.cookieSecure,
  sameSite: config.auth.cookieSameSite,
  path: '/',
});

export const setSessionCookie = (res, token, { rememberMe = true } = {}) => {
  res.cookie(config.auth.cookieName, token, {
    ...baseCookie(),
    ...(rememberMe && { maxAge: config.auth.expiresDays * DAY_MS }),
  });
};

export const clearSessionCookie = (res) => {
  res.clearCookie(config.auth.cookieName, baseCookie());
};

/** Cookie first; "Authorization: Bearer <token>" also works (handy for Postman / tests). */
export const readSessionToken = (req) => {
  const fromCookie = req.cookies?.[config.auth.cookieName];
  if (fromCookie) return fromCookie;
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
};
