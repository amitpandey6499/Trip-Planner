import { findUserById } from '../services/authService.js';
import { clearSessionCookie, readSessionToken, verifySession } from '../utils/authToken.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * AUTH (Part 4) — real JWT sessions.
 * Contract kept from Part 1: controllers only use  req.user = { id, name, email, role, ... }.
 */

const resolveUser = async (req, res) => {
  const token = readSessionToken(req);
  if (!token) return null;
  const userId = verifySession(token);
  const user = userId ? await findUserById(userId) : null;
  if (!user) clearSessionCookie(res); // expired / tampered token or deleted account
  return user;
};

/** Route needs a logged-in user → 401 otherwise. */
export const requireAuth = async (req, res, next) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return next(ApiError.unauthorized('Please log in to continue.'));
    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
};

/** Route works for guests too: req.user is the user or null. */
export const optionalAuth = async (req, res, next) => {
  try {
    req.user = await resolveUser(req, res);
    return next();
  } catch (err) {
    return next(err);
  }
};

/** Use after requireAuth. */
export const requireRole = (role) => (req, _res, next) =>
  req.user?.role === role ? next() : next(ApiError.forbidden());
