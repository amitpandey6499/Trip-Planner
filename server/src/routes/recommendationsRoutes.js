import express from 'express';
import { placesController } from '../controllers/placesController.js';

const router = express.Router();

// Hotel recommendations
router.get('/hotels', placesController.getHotels);

// Restaurant recommendations
router.get('/restaurants', placesController.getRestaurants);

export default router;
