import { getDestination, listDestinations } from '../services/destinationService.js';
import { addFavorite, listFavorites, removeFavorite } from '../services/favoriteService.js';
import { getRestaurants, getStays } from '../services/recommendationService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Part 10 — destinations, stays / food suggestions and favourites. */
export const destinationController = {
  // GET /api/destinations?q=&category=&sort=&month=
  list: asyncHandler(async (req, res) => {
    const data = await listDestinations(req.validQuery);
    res.json({ success: true, count: data.length, data });
  }),

  // GET /api/destinations/:slug
  detail: asyncHandler(async (req, res) => {
    const data = await getDestination(req.params.slug);
    if (!data) throw ApiError.notFound('Destination not found.');
    res.json({ success: true, data });
  }),

  // GET /api/recommendations/hotels?destination=&budget=&checkIn=&checkOut=&travelers=
  stays: asyncHandler(async (req, res) => {
    const result = await getStays(req.validQuery);
    res.json({ success: true, count: result.items.length, destination: result.destination, sources: result.sources, data: result.items });
  }),

  // GET /api/recommendations/restaurants?destination=&veg=1
  restaurants: asyncHandler(async (req, res) => {
    const result = await getRestaurants(req.validQuery);
    res.json({ success: true, count: result.items.length, destination: result.destination, note: result.note, data: result.items });
  }),

  // GET /api/favorites
  favorites: asyncHandler(async (req, res) => {
    const { slugs, destinations } = await listFavorites(req.user.id);
    res.json({ success: true, data: slugs, destinations });
  }),

  // PUT /api/favorites/:slug
  addFavorite: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await addFavorite(req.user.id, req.params.slug) });
  }),

  // DELETE /api/favorites/:slug
  removeFavorite: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await removeFavorite(req.user.id, req.params.slug) });
  }),
};
