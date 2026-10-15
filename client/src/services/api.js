import axios from 'axios';
import { SESSION_EXPIRED_EVENT } from './events.js';
import { postStream } from './stream.js';

/**
 * The ONLY place the frontend talks to the backend.
 * Pages call authApi / tripApi / ... — if an endpoint changes, only this file changes.
 *
 * In development requests go to "/api" and Vite proxies them to http://localhost:5000
 * (see vite.config.js). VITE_API_BASE_URL is only needed for a separately hosted backend.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true, // the httpOnly login cookie travels with every request
  timeout: 60000, // AI generation can take a while
  headers: {
    'Content-Type': 'application/json',
  },
});

export { SESSION_EXPIRED_EVENT };

// These calls are allowed to answer 401 without meaning "your session expired".
const AUTH_PROBES = ['/auth/me', '/auth/login', '/auth/register', '/auth/demo'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.error;
    if (serverMessage) {
      error.message = serverMessage;
    } else if (error.code === 'ECONNABORTED') {
      error.message = 'The server took too long to respond. Please try again.';
    } else if (!error.response) {
      error.message = 'Cannot reach the server. Is the backend running?';
    }
    // Field errors from the shared schemas: { field: message }
    error.fields = error.response?.data?.details?.fields ?? {};

    if (status === 401 && !AUTH_PROBES.some((path) => error.config?.url?.startsWith(path))) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  },
);

const data = (promise) => promise.then((res) => res.data);

export const authApi = {
  me: () => data(api.get('/auth/me')),
  register: (body) => data(api.post('/auth/register', body)),
  login: (body) => data(api.post('/auth/login', body)),
  loginDemo: () => data(api.post('/auth/demo')),
  logout: () => data(api.post('/auth/logout')),
};

export const tripApi = {
  // Live generation (Part 9): onEvent('progress' | 'day' | 'reset', data); fresh: true skips the AI cache.
  generate: (preferences, { fresh = false, onEvent, signal } = {}) =>
    postStream('/trips/generate', preferences, { params: fresh ? { fresh: 1 } : undefined, onEvent, signal }),
  // body: { preferences, itinerary, dayNumber, pace?, note? }
  regenerateDay: (body) => data(api.post('/trips/regenerate-day', body, { timeout: 120000 })),
  // Map (Part 8): place positions + road routes, with progress events.
  updateMap: (itinerary, { force = false, onEvent, signal } = {}) => postStream('/map/enrich', { itinerary, force }, { onEvent, signal }),
  updateSavedTripMap: (id, { force = false, onEvent, signal } = {}) => postStream(`/trips/${id}/map`, { force }, { onEvent, signal }),
  // body: { tripData, preferences, itinerary }
  saveTrip: (body) => data(api.post('/trips', body)),
  getTrips: () => data(api.get('/trips')),
  getTripById: (id) => data(api.get(`/trips/${id}`)),
  updateTrip: (id, changes) => data(api.put(`/trips/${id}`, changes)),
  deleteTrip: (id) => data(api.delete(`/trips/${id}`)),

  getHealth: () => data(api.get('/health')),
};

// Part 10 — destinations, stays / food, favourites
export const destinationApi = {
  list: (params = {}) => data(api.get('/destinations', { params })),
  get: (slug) => data(api.get(`/destinations/${encodeURIComponent(slug)}`)),
  stays: (params) => data(api.get('/recommendations/hotels', { params })),
  restaurants: (params) => data(api.get('/recommendations/restaurants', { params })),
};

export const favoritesApi = {
  list: () => data(api.get('/favorites')),
  add: (slug) => data(api.put(`/favorites/${encodeURIComponent(slug)}`)),
  remove: (slug) => data(api.delete(`/favorites/${encodeURIComponent(slug)}`)),
};

// Part 11 — weather for the trip dates, how to get there
export const travelApi = {
  weather: (params) => data(api.get('/travel/weather', { params })),
  reach: (params) => data(api.get('/travel/reach', { params })),
};

export const contactApi = {
  send: (message) => data(api.post('/contact', message)),
};

export default api;
