import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to inject auth token or demo mode token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('trip_auth_token');
  const user = localStorage.getItem('trip_user');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // Demo user fallback
    config.headers.Authorization = 'Bearer demo_user_token';
    config.headers['x-demo-user'] = 'true';
  }

  if (user) {
    try {
      const parsed = JSON.parse(user);
      config.headers['x-user-id'] = parsed.id || 'user_demo_123';
      config.headers['x-user-email'] = parsed.email || 'demo@tripplanner.com';
    } catch (e) {
      // Ignore
    }
  }

  return config;
});

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
