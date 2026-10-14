/**
 * AUTH SEAM (temporary, Parts 1-3)
 * ---------------------------------
 * Controllers only rely on ONE contract:  req.user = { id, email, name, avatarUrl }
 *
 * Until real login arrives in Part 4, every request acts as the seeded demo user.
 * Part 4 replaces ONLY the bodies of these two functions with JWT verification;
 * no controller has to change.
 *
 * Note: request headers such as `x-user-id` are deliberately ignored. Trusting them
 * let anyone read or change another user's trips.
 */
const DEMO_USER = Object.freeze({
  id: 'user_demo_123',
  email: 'demo@tripplanner.com',
  name: 'Aarav Sharma',
  avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Aarav%20Sharma',
  isDemo: true,
});

/** Route needs a logged-in user. */
export const requireAuth = (req, _res, next) => {
  req.user = DEMO_USER;
  next();
};

/** Route works with or without a user (req.user may be null after Part 4). */
export const optionalAuth = (req, _res, next) => {
  req.user = DEMO_USER;
  next();
};
