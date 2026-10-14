import express from 'express';
import { userController } from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', requireAuth, userController.getProfile);

export default router;
