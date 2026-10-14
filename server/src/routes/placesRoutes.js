import express from 'express';
import { placesController } from '../controllers/placesController.js';

const router = express.Router();

// Search destinations
router.get('/search', placesController.search);

// Destination details
router.get('/:slug', placesController.getDetails);

export default router;
