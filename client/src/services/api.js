import axios from 'axios';

/**
 * The ONLY place the frontend talks to the backend.
 * Pages call tripApi.* — if an endpoint changes, only this file changes.
 *
 * In development requests go to "/api" and Vite proxies them to http://localhost:5000
 * (see vite.config.js). VITE_API_BASE_URL is only needed for a separately hosted backend.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true, // the login cookie (Part 4) travels with every request
  timeout: 60000, // AI generation can take a while
  headers: {
    'Content-Type': 'application/json'
  }
});

// Turn server errors into readable messages: err.message = server's "error" text.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const serverMessage = error.response?.data?.error;
    if (serverMessage) {
      error.message = serverMessage;
    } else if (error.code === 'ECONNABORTED') {
      error.message = 'The server took too long to respond. Please try again.';
    } else if (!error.response) {
      error.message = 'Cannot reach the server. Is the backend running?';
    }
    return Promise.reject(error);
  }
);

export const tripApi = {
  // Generate itinerary via AI
  generate: async (tripPreferences) => {
    const res = await api.post('/trips/generate', tripPreferences);
    return res.data;
  },

  // Save trip to database
  saveTrip: async (tripData, itinerary) => {
    const res = await api.post('/trips', { tripData, itinerary });
    return res.data;
  },

  // Get all trips for current user
  getTrips: async () => {
    const res = await api.get('/trips');
    return res.data;
  },

  // Get trip by id
  getTripById: async (id) => {
    const res = await api.get(`/trips/${id}`);
    return res.data;
  },

  // Update trip
  updateTrip: async (id, updateData) => {
    const res = await api.put(`/trips/${id}`, updateData);
    return res.data;
  },

  // Delete trip
  deleteTrip: async (id) => {
    const res = await api.delete(`/trips/${id}`);
    return res.data;
  },

  // Search destinations
  searchDestinations: async (q = '', category = 'all') => {
    const res = await api.get('/places/search', { params: { q, category } });
    return res.data;
  },

  // Get destination details
  getDestination: async (slug) => {
    const res = await api.get(`/places/${slug}`);
    return res.data;
  },

  // Get hotel recommendations
  getHotels: async (destination, budget = 'Moderate') => {
    const res = await api.get('/recommendations/hotels', { params: { destination, budget } });
    return res.data;
  },

  // Get restaurant recommendations
  getRestaurants: async (destination) => {
    const res = await api.get('/recommendations/restaurants', { params: { destination } });
    return res.data;
  },

  // Health & system check
  getHealth: async () => {
    const res = await api.get('/health');
    return res.data;
  },

  // Profile details
  getProfile: async () => {
    const res = await api.get('/user/profile');
    return res.data;
  }
};

export default api;
