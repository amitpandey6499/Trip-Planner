import { asyncHandler } from '../utils/asyncHandler.js';

export const userController = {
  // GET /api/user/profile
  getProfile: asyncHandler(async (req, res) => {
    const { id, name, email, avatarUrl, isDemo = false } = req.user;
    res.status(200).json({ success: true, data: { id, name, email, avatarUrl, isDemo } });
  }),
};
