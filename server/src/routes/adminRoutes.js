import express from 'express';
import { AdminStatsQuery, AdminUsersQuery, MessageStatusSchema } from '@tripplanner/shared';
import { adminController as c } from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { validateQuery } from '../middleware/validateQuery.js';

/** Part 17 — only admins (stored role, or ADMIN_EMAILS). Everyone else: 401 (not logged in) / 403. */
const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/stats', validateQuery(AdminStatsQuery), c.stats);
router.get('/messages', c.messages);
router.put('/messages/:id', validateBody(MessageStatusSchema), c.setMessage);
router.delete('/messages/:id', c.deleteMessage);
router.get('/users', validateQuery(AdminUsersQuery), c.users);

export default router;
