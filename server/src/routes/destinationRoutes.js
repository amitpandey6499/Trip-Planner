import express from 'express';
import { DestinationListQuery, RestaurantsQuery, StaysQuery } from '@tripplanner/shared';
import { destinationController as c } from '../controllers/destinationController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validateQuery.js';

/** Part 10 routes, mounted in app.js. */
export const destinationRoutes = express.Router();
destinationRoutes.get('/', validateQuery(DestinationListQuery), c.list);
destinationRoutes.get('/:slug', c.detail);

export const recommendationRoutes = express.Router();
recommendationRoutes.get('/hotels', validateQuery(StaysQuery), c.stays);
recommendationRoutes.get('/restaurants', validateQuery(RestaurantsQuery), c.restaurants);

export const favoriteRoutes = express.Router();
favoriteRoutes.use(requireAuth);
favoriteRoutes.get('/', c.favorites);
favoriteRoutes.put('/:slug', c.addFavorite);
favoriteRoutes.delete('/:slug', c.removeFavorite);

/** Old Part 1 addresses (/api/places/search, /api/places/:slug) still work. */
export const legacyPlacesRoutes = express.Router();
legacyPlacesRoutes.get('/search', validateQuery(DestinationListQuery), c.list);
legacyPlacesRoutes.get('/:slug', c.detail);
