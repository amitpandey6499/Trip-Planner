import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { defaultTripDates, normalizeItinerary } from '@tripplanner/shared';
import { tripApi } from '../services/api.js';
import { useAuth } from './AuthContext';

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

/** Style preferences saved with a trip (so Edit can restore the whole wizard). */
const stylePreferences = (p) => ({
  interests: p.interests ?? [],
  travelStyle: p.travelStyle,
  accommodationType: p.accommodationType,
  dietaryPreference: p.dietaryPreference,
  specialNotes: p.specialNotes ?? '',
  ...(p.originCity && { originCity: p.originCity }),
  language: p.language ?? 'en',
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

/**
 * The itinerary you are looking at survives a page refresh: it is kept in sessionStorage
 * (per user, per browser tab; cleared on logout). Saved trips are always re-loaded from the server.
 */
const draftKey = (userId) => `tripplanner:draft:${userId}`;
const readDraft = (userId) => {
  try {
    const raw = sessionStorage.getItem(draftKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const writeDraft = (userId, draft) => {
  try {
    if (draft) sessionStorage.setItem(draftKey(userId), JSON.stringify(draft));
    else sessionStorage.removeItem(draftKey(userId));
  } catch {
    // storage full or blocked (private mode): the app still works, the draft just won't survive a refresh
  }
};

export const TripProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentItinerary, setCurrentItinerary] = useState(null);
  // Two different things on purpose:
  //   currentPreferences = starting values for the NEXT new trip (Quick search / Explore / wizard fill these)
  //   planPreferences    = the preferences the OPEN itinerary was made with (Save, Regenerate, Edit use these)
  // Keeping them apart means "Plan Trip → Jaipur" on Explore can never change the Manali trip that is open.
  const [currentPreferences, setCurrentPreferences] = useState(makeDefaultPreferences);
  const [planPreferences, setPlanPreferences] = useState(null);
  // id of the saved trip the current itinerary belongs to (null = not saved yet)
  const [currentTripId, setCurrentTripId] = useState(null);
  // true when the shown itinerary has changes that are not saved yet
  const [isDirty, setIsDirty] = useState(false);
  // info from the last generation: { source, cached, notice, ai }
  const [lastMeta, setLastMeta] = useState(null);
  // goes up by one after every successful generation (the itinerary page celebrates new plans only)
  const [generationId, setGenerationId] = useState(0);
  const [savedTrips, setSavedTrips] = useState([]);
  const [loading, setLoading] = useState(false); // generating an itinerary
  const [tripLoading, setTripLoading] = useState(false); // opening one saved trip
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
   * Generate an itinerary.
   *   tripId → editing that saved trip ("Update Trip" overwrites it, no duplicate)
   *   fresh  → skip the server's AI cache (Regenerate button)
   */
  const generateTrip = useCallback(
    async (preferences, { tripId = null, fresh = false } = {}) => {
      try {
        setLoading(true);
        setError(null);
        setCurrentPreferences(preferences);
        const res = await tripApi.generate(preferences, { fresh });
        // The server returns validated preferences (endDate filled in, defaults applied).
        setCurrentPreferences(res.preferences ?? preferences);
        setPlanPreferences(res.preferences ?? preferences);
        setCurrentItinerary(res.data);
        setCurrentTripId(tripId);
        setIsDirty(true);
        setLastMeta(res.meta ?? null);
        setGenerationId((n) => n + 1);
        showToast(res.meta?.cached ? `Loaded a saved AI plan for ${res.data.destination}` : `Itinerary generated for ${res.data.destination}!`);
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

  /** Save (first time) or update (already saved) the current itinerary. Returns the saved trip. */
  const saveCurrentTrip = useCallback(async () => {
    if (!currentItinerary) return null;
    try {
      setSaving(true);
      setError(null);
      const p = planPreferences ?? currentPreferences;
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
      const res = await tripApi.saveTrip({ tripData, preferences: stylePreferences(p), itinerary: currentItinerary });
      setCurrentTripId(res.data.id);
      setCurrentItinerary(res.data.itinerary ?? currentItinerary);
      setIsDirty(false);
      showToast(currentTripId ? 'Trip updated!' : 'Trip successfully saved to your dashboard!');
      fetchTrips();
      return res.data;
    } catch (err) {
      setError(`Failed to save trip: ${err.message}`);
      return null;
    } finally {
      setSaving(false);
    }
  }, [currentItinerary, planPreferences, currentPreferences, currentTripId, fetchTrips, showToast]);

  const deleteTrip = useCallback(
    async (id) => {
      try {
        await tripApi.deleteTrip(id);
        setSavedTrips((prev) => prev.filter((t) => t.id !== id));
        if (id === currentTripId) {
          setCurrentTripId(null);
          setCurrentItinerary(null);
          setPlanPreferences(null);
          setIsDirty(false);
        }
        showToast('Trip deleted successfully');
      } catch (err) {
        setError(`Failed to delete trip: ${err.message}`);
      }
    },
    [currentTripId, showToast],
  );

  /** Rename a saved trip (PUT /api/trips/:id { title }). Throws on failure. */
  const renameTrip = useCallback(
    async (id, title) => {
      const res = await tripApi.updateTrip(id, { title });
      setSavedTrips((prev) => prev.map((t) => (t.id === id ? { ...t, title: res.data.title } : t)));
      if (id === currentTripId) setCurrentItinerary((it) => (it ? { ...it, title: res.data.title } : it));
      showToast('Trip renamed');
      return res.data;
    },
    [currentTripId, showToast],
  );

  /** Load a saved trip (by URL id). Its preferences become planPreferences (used by Edit / Regenerate / Save). */
  const loadTripById = useCallback(async (id) => {
    try {
      setTripLoading(true);
      setError(null);
      const res = await tripApi.getTripById(id);
      const trip = res.data;
      const facts = factsFromTrip(trip);
      setPlanPreferences({ ...makeDefaultPreferences(), ...(trip.preferences ?? {}), ...facts });
      setCurrentItinerary(upgradeItinerary(trip.itinerary, facts));
      setCurrentTripId(trip.id);
      setIsDirty(false);
      setLastMeta(null);
      return trip;
    } catch (err) {
      setError(err.response?.status === 404 ? 'This trip does not exist or is not yours.' : `Failed to load trip: ${err.message}`);
      return null;
    } finally {
      setTripLoading(false);
    }
  }, []);

  // Trips belong to the logged-in user: reload on login, clear everything on logout / user switch.
  const previousUserId = useRef(null);
  const [draftReady, setDraftReady] = useState(false);
  useEffect(() => {
    const userId = user?.id ?? null;
    const previous = previousUserId.current;
    previousUserId.current = userId;
    if (previous && previous !== userId) {
      writeDraft(previous, null);
      setSavedTrips([]);
      setCurrentItinerary(null);
      setPlanPreferences(null);
      setCurrentTripId(null);
      setIsDirty(false);
      setLastMeta(null);
      setCurrentPreferences(makeDefaultPreferences());
      setError(null);
    }
    if (userId) {
      const draft = readDraft(userId);
      if (draft?.itinerary) {
        setCurrentItinerary(draft.itinerary);
        setPlanPreferences({ ...makeDefaultPreferences(), ...draft.preferences });
        // Guest → login keeps the wizard values the guest already typed; a refresh gets them back from the draft.
        setCurrentPreferences((prev) => (prev.destination ? prev : { ...prev, ...(draft.seed ?? draft.preferences) }));
        setCurrentTripId(draft.tripId ?? null);
        setIsDirty(Boolean(draft.dirty));
        setLastMeta(draft.meta ?? null);
      }
      fetchTrips();
    }
    setDraftReady(Boolean(userId));
  }, [user?.id, fetchTrips]);

  // Keep the draft in sessionStorage up to date.
  useEffect(() => {
    if (!user?.id || !draftReady) return;
    writeDraft(
      user.id,
      currentItinerary
        ? {
            itinerary: currentItinerary,
            preferences: planPreferences,
            seed: currentPreferences,
            tripId: currentTripId,
            dirty: isDirty,
            meta: lastMeta,
          }
        : null,
    );
  }, [user?.id, draftReady, currentItinerary, planPreferences, currentPreferences, currentTripId, isDirty, lastMeta]);

  return (
    <TripContext.Provider
      value={{
        currentItinerary,
        setCurrentItinerary,
        currentPreferences,
        setCurrentPreferences,
        planPreferences,
        currentTripId,
        isDirty,
        lastMeta,
        generationId,
        draftReady,
        savedTrips,
        loading,
        tripLoading,
        tripsLoading,
        saving,
        error,
        clearError,
        successToast,
        showToast,
        generateTrip,
        saveCurrentTrip,
        deleteTrip,
        renameTrip,
        fetchTrips,
        loadTripById,
      }}
    >
      {children}
    </TripContext.Provider>
  );
};

export const useTrip = () => useContext(TripContext);
