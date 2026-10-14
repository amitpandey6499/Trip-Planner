import React, { createContext, useContext, useState, useEffect } from 'react';
import { tripApi } from '../services/api.js';

const TripContext = createContext();

export const TripProvider = ({ children }) => {
  const [currentItinerary, setCurrentItinerary] = useState(null);
  const [currentPreferences, setCurrentPreferences] = useState({
    destination: 'Manali',
    startDate: '2026-11-12',
    endDate: '2026-11-15',
    durationDays: 4,
    totalBudget: 15000,
    budgetCategory: 'Moderate',
    travelersCount: 2,
    interests: ['Nature & Outdoors', 'Adventure', 'Food & Cuisine'],
    travelStyle: 'Balanced',
    accommodationType: 'Mid-Range Hotel',
    dietaryPreference: 'No Restrictions',
    specialNotes: ''
  });
  const [savedTrips, setSavedTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Auto clear toast
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  const showToast = (message) => {
    setSuccessToast(message);
  };

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await tripApi.getTrips();
      if (res && res.data) {
        setSavedTrips(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch trips from server:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate itinerary
  const generateTrip = async (preferences) => {
    try {
      setLoading(true);
      setError(null);
      setCurrentPreferences(preferences);

      const res = await tripApi.generate(preferences);
      if (res.success && res.data) {
        setCurrentItinerary(res.data);
        showToast(`Itinerary generated for ${preferences.destination}!`);
        return res.data;
      } else {
        throw new Error(res.error || 'Failed to generate itinerary');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Something went wrong';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Save current trip to DB
  const saveCurrentTrip = async () => {
    if (!currentItinerary) return;
    try {
      setSaving(true);
      const tripData = {
        destination: currentItinerary.destination,
        title: currentItinerary.title || `${currentItinerary.destination} Trip`,
        startDate: currentPreferences.startDate || '2026-11-12',
        endDate: currentPreferences.endDate || '2026-11-15',
        durationDays: currentItinerary.days?.length || currentPreferences.durationDays || 4,
        travelersCount: currentPreferences.travelersCount || 2,
        totalBudget: currentItinerary.budgetBreakdown?.totalEstimated || currentPreferences.totalBudget || 15000,
        budgetCategory: currentPreferences.budgetCategory || 'Moderate',
        status: 'Upcoming',
        destinationImage: currentItinerary.destinationImage
      };

      const res = await tripApi.saveTrip(tripData, currentItinerary);
      if (res.success) {
        showToast('Trip successfully saved to your dashboard!');
        await fetchTrips();
        return res.data;
      }
    } catch (err) {
      setError('Failed to save trip: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete trip
  const deleteTrip = async (id) => {
    try {
      const res = await tripApi.deleteTrip(id);
      if (res.success) {
        setSavedTrips(prev => prev.filter(t => t.id !== id));
        showToast('Trip deleted successfully');
      }
    } catch (err) {
      setError('Failed to delete trip: ' + err.message);
    }
  };

  // Load a single trip
  const loadTripById = async (id) => {
    try {
      setLoading(true);
      const res = await tripApi.getTripById(id);
      if (res.success && res.data) {
        if (res.data.itinerary) {
          setCurrentItinerary(res.data.itinerary);
        }
        return res.data;
      }
    } catch (err) {
      console.error('Failed to load trip:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchTrips();
  }, []);

  return (
    <TripContext.Provider
      value={{
        currentItinerary,
        setCurrentItinerary,
        currentPreferences,
        setCurrentPreferences,
        savedTrips,
        loading,
        saving,
        error,
        successToast,
        showToast,
        generateTrip,
        saveCurrentTrip,
        deleteTrip,
        fetchTrips,
        loadTripById
      }}
    >
      {children}
    </TripContext.Provider>
  );
};

export const useTrip = () => useContext(TripContext);
