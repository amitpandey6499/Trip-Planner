import {
  searchDestinations,
  getDestinationDetails,
  getHotelsForDestination,
  getRestaurantsForDestination
} from '../services/placesService.js';

export const placesController = {
  // GET /api/places/search?q=manali&category=Mountains
  search(req, res, next) {
    try {
      const { q, category } = req.query;
      const results = searchDestinations(q, category);
      return res.status(200).json({
        success: true,
        count: results.length,
        data: results
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/places/:slug
  getDetails(req, res, next) {
    try {
      const { slug } = req.params;
      const dest = getDestinationDetails(slug);
      if (!dest) {
        return res.status(404).json({ success: false, error: 'Destination not found' });
      }
      return res.status(200).json({ success: true, data: dest });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/recommendations/hotels?destination=Manali&budget=Moderate
  async getHotels(req, res, next) {
    try {
      const { destination, budget } = req.query;
      if (!destination) {
        return res.status(400).json({ success: false, error: 'Destination parameter is required' });
      }
      const hotels = await getHotelsForDestination(destination, budget);
      return res.status(200).json({
        success: true,
        destination,
        count: hotels.length,
        data: hotels
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/recommendations/restaurants?destination=Manali
  async getRestaurants(req, res, next) {
    try {
      const { destination } = req.query;
      if (!destination) {
        return res.status(400).json({ success: false, error: 'Destination parameter is required' });
      }
      const restaurants = await getRestaurantsForDestination(destination);
      return res.status(200).json({
        success: true,
        destination,
        count: restaurants.length,
        data: restaurants
      });
    } catch (err) {
      next(err);
    }
  }
};
