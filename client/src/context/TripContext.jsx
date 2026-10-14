import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { defaultTripDates, normalizeItinerary } from '@tripplanner/shared';
import { tripApi } from '../services/api.js';

const TripContext = createContext(null);

/** Fresh wizard defaults (dates relative to today, so they never go stale). */
export const makeDefaultPreferences = () => ({
  destination: '',
  ...defaultTripDates(),
  durationDays: 4,
  travelersCount: 2,
  totalBudget: 15000,
  budgetCategory: 'Moderate',
  interests: ['Nature & Outdoors', 'Food & Cuisine'],
  travelStyle: 'Balanced',
  accommodationType: 'Mid-Range Hotel',
  dietaryPreference: 'No Restrictions',
  specialNotes: '',
  language: 'en',
});

/** Trip facts that live on a saved trip (used to refill the wizard / re-normalize). */
const factsFromTrip = (trip) => ({
  destination: trip.destination,
  startDate: trip.startDate,
  endDate: trip.endDate,
  durationDays: trip.durationDays,
  travelersCount: trip.travelersCount,
  totalBudget: trip.totalBudget,
  budgetCategory: trip.budgetCategory,
});

/** Old saved itineraries may predate the shared contract: upgrade them for display. */
const upgradeItinerary = (itinerary, facts) => {
  if (!itinerary) return null;
  try {
    return normalizeItinerary(itinerary, facts);
  } catch (err) {
    console.warn('Saved itinerary could not be upgraded:', err.message);
    return itinerary;
  }
};

export const TripProvider = ({ children }) => {
  const [currentItinerary, setCurrentItinerary] = useState(null);
  const [currentPreferences, setCurrentPreferences] = useState(makeDefaultPreferences);
  // id of the saved trip the current itinerary belongs to (null = not saved yet)
  const [currentTripId, setCurrentTripId] = useState(null);
  const [savedTrips, setSavedTrips] = useState([]);
  const [loading, setLoading] = useState(false); // generating an itinerary
  const [tripsLoading, setTripsLoading] = useState(false); // loading My Trips
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  useEffect(() => {
    if (!successToast) return undefined;
    const timer = setTimeout(() => setSuccessToast(null), 4000);
    return () => clearTimeout(timer);
  }, [successToast]);

  const showToast = useCallback((message) => setSuccessToast(message), []);
  const clearError = useCallback(() => setError(null), []);

  const fetchTrips = useCallback(async () => {
    try {
      setTripsLoading(true);
      const res = await tripApi.getTrips();
      setSavedTrips(res?.data ?? []);
    } catch (err) {
      console.warn('Failed to fetch trips from server:', err.message);
    } finally {
      setTripsLoading(false);
    }
  }, []);

  /**
   * Generate an itinerary. Pass { tripId } when editing a saved trip, so "Save" updates it
   * instead of creating a duplicate.
   */
  const generateTrip = useCallback(
    async (preferences, { tripId = null } = {}) => {
      try {
        setLoading(true);
        setError(null);
        setCurrentPreferences(preferences);
        const res = await tripApi.generate(preferences);
        // The server returns validated preferences (endDate filled in, defaults applied).
        setCurrentPreferences(res.preferences ?? preferences);
        setCurrentItinerary(res.data);
        setCurrentTripId(tripId);
        showToast(`Itinerary generated for ${res.data.destination}!`);
        return res.data;
      } catch (err) {
        setError(err.message || 'Something went wrong');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  /** Save (first time) or update (already saved) the current itinerary. */
  const saveCurrentTrip = useCallback(async () => {
    if (!currentItinerary) return null;
    try {
      setSaving(true);
      setError(null);
      const p = currentPreferences;
      const tripData = {
        ...(currentTripId && { id: currentTripId }),
        title: currentItinerary.title,
        destination: currentItinerary.destination || p.destination,
        startDate: p.startDate,
        endDate: p.endDate,
        travelersCount: p.travelersCount,
        totalBudget: p.totalBudget, // the user's budget; the estimate lives in the itinerary
        budgetCategory: p.budgetCategory,
        destinationImage: currentItinerary.destinationImage,
      };
      const res = await tripApi.saveTrip(tripData, currentItinerary);
      setCurrentTripId(res.data.id);
      showToast(currentTripId ? 'Trip updated!' : 'Trip successfully saved to your dashboard!');
      fetchTrips();
      return res.data;
    } catch (err) {
      setError(`Failed to save trip: ${err.message}`);
      return null;
    } finally {
      setSaving(false);
    }
  }, [currentItinerary, currentPreferences, currentTripId, fetchTrips, showToast]);

  const deleteTrip = useCallback(
    async (id) => {
      try {
        await tripApi.deleteTrip(id);
        setSavedTrips((prev) => prev.filter((t) => t.id !== id));
        if (id === currentTripId) setCurrentTripId(null);
        showToast('Trip deleted successfully');
      } catch (err) {
        setError(`Failed to delete trip: ${err.message}`);
      }
    },
    [currentTripId, showToast],
  );

  /** Load a saved trip into the itinerary view and refill the wizard with its facts. */
  const loadTripById = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const res = await tripApi.getTripById(id);
      const trip = res.data;
      const facts = factsFromTrip(trip);
      setCurrentPreferences((prev) => ({ ...prev, ...facts }));
      setCurrentItinerary(upgradeItinerary(trip.itinerary, facts));
      setCurrentTripId(trip.id);
      return trip;
    } catch (err) {
      setError(`Failed to load trip: ${err.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  return (
    <TripContext.Provider
      value={{
        currentItinerary,
        setCurrentItinerary,
        currentPreferences,
        setCurrentPreferences,
        currentTripId,
        savedTrips,
        loading,
        tripsLoading,
        saving,
        error,
        clearError,
        successToast,
        showToast,
        generateTrip,
        saveCurrentTrip,
        deleteTrip,
        fetchTrips,
        loadTripById,
      }}
    >
      {children}
    </TripContext.Provider>
  );
};

export const useTrip = () => useContext(TripContext);
