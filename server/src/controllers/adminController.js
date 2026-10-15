import { deleteMessage, getStats, listMessages, listUsers, setMessageStatus } from '../services/adminService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Part 17 — admin dashboard (requireAuth + requireRole('admin') in routes/adminRoutes.js). */
export const adminController = {
  // GET /api/admin/stats?days=7|30|90
  stats: asyncHandler(async (req, res) => res.json({ success: true, data: await getStats(req.validQuery) })),
  // GET /api/admin/messages?status=new|read|all
  messages: asyncHandler(async (req, res) => res.json({ success: true, data: await listMessages({ status: req.query.status }) })),
  // PUT /api/admin/messages/:id { status }
  setMessage: asyncHandler(async (req, res) => res.json({ success: true, data: await setMessageStatus(req.params.id, req.body.status) })),
  // DELETE /api/admin/messages/:id
  deleteMessage: asyncHandler(async (req, res) => {
    await deleteMessage(req.params.id);
    res.json({ success: true, message: 'Message deleted.' });
  }),
  // GET /api/admin/users?q=
  users: asyncHandler(async (req, res) => res.json({ success: true, data: await listUsers(req.validQuery) })),
};
