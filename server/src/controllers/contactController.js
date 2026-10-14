import { ContactMessage } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const contactController = {
  // POST /api/contact   body: ContactSchema
  create: asyncHandler(async (req, res) => {
    const message = await ContactMessage.create({ ...req.body, user: req.user?.id });
    res.status(201).json({ success: true, message: 'Thanks! Your message has been saved.', data: { id: message.id } });
  }),
};
