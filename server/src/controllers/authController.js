import { config } from '../config/env.js';
import { loginUser, registerUser } from '../services/authService.js';
import { ensureDemoData } from '../services/demoService.js';
import { User } from '../models/index.js';
import { countTrips } from '../services/tripService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { clearSessionCookie, setSessionCookie, signSession } from '../utils/authToken.js';

const startSession = (res, user, { rememberMe = true } = {}) => {
  setSessionCookie(res, signSession(user.id, { rememberMe }), { rememberMe });
};

export const authController = {
  // POST /api/auth/register   body: RegisterSchema
  register: asyncHandler(async (req, res) => {
    const user = await registerUser(req.body);
    startSession(res, user);
    res.status(201).json({ success: true, data: user });
  }),

  // POST /api/auth/login   body: LoginSchema
  login: asyncHandler(async (req, res) => {
    const user = await loginUser(req.body);
    startSession(res, user, { rememberMe: req.body.rememberMe });
    res.status(200).json({ success: true, data: user });
  }),

  // POST /api/auth/demo — one-click login to the shared demo account (for evaluators)
  demo: asyncHandler(async (_req, res) => {
    if (!config.auth.demoLoginEnabled) throw ApiError.notFound('Demo login is turned off.');
    const demoUser = await ensureDemoData();
    const user = User.toPublic(demoUser);
    startSession(res, user, { rememberMe: false });
    res.status(200).json({ success: true, data: user });
  }),

  // POST /api/auth/logout
  logout: (_req, res) => {
    clearSessionCookie(res);
    res.status(200).json({ success: true, message: 'Logged out.' });
  },

  // GET /api/auth/me  (requireAuth)
  me: asyncHandler(async (req, res) => {
    const tripCount = await countTrips(req.user.id);
    res.status(200).json({ success: true, data: { ...req.user, tripCount } });
  }),
};
