import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { defaultTripDates, needsMapUpdate, normalizeItinerary } from '@tripplanner/shared';
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
  // Part 9: live progress of the running generation { destination, total, days: [{ index, day }], stage, message, percent, startedAt }
  const [generation, setGeneration] = useState(null);
  const generationAbort = useRef(null);
  // Part 9: number of the day that is being re-planned right now
  const [dayLoading, setDayLoading] = useState(null);
  // Part 8: map update { state: 'idle' | 'working' | 'done' | 'error', message?, percent?, notice? }
  const [mapStatus, setMapStatus] = useState({ state: 'idle' });
  // Goes up whenever a DIFFERENT plan is shown (generated, loaded, a day changed, saved, cleared).
  // Map updates do not change it, so a slow map answer for an old plan is never applied to a new one.
  const [planRevision, setPlanRevision] = useState(0);
  const bumpPlan = useCallback(() => setPlanRevision((n) => n + 1), []);
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
   * Generate an itinerary (live: progress and days arrive while the AI writes — Part 9).
   *   tripId → editing that saved trip ("Update Trip" overwrites it, no duplicate)
   *   fresh  → skip the server's AI cache (Regenerate button)
   * Rejects with an AbortError when the user presses Cancel.
   */
  const generateTrip = useCallback(
    async (preferences, { tripId = null, fresh = false } = {}) => {
      generationAbort.current?.abort();
      const controller = new AbortController();
      generationAbort.current = controller;
      setGeneration({
        destination: preferences.destination,
        total: preferences.durationDays ?? null,
        days: [],
        stage: 'start',
        message: 'Sending your trip details...',
        percent: 2,
        startedAt: Date.now(),
      });
      const onEvent = (name, data) => {
        if (controller.signal.aborted) return;
        if (name === 'progress') {
          setGeneration((g) => g && { ...g, stage: data.stage, message: data.message ?? g.message, percent: Math.max(g.percent, data.percent ?? 0) });
        } else if (name === 'day') {
          setGeneration(
            (g) =>
              g && {
                ...g,
                total: data.total ?? g.total,
                days: [...g.days.filter((d) => d.index !== data.index), { index: data.index, day: data.day }].sort((a, b) => a.index - b.index),
              },
          );
        } else if (name === 'reset') {
          setGeneration((g) => g && { ...g, days: [] });
        }
      };

      try {
        setLoading(true);
        setError(null);
        setCurrentPreferences(preferences);
        const res = await tripApi.generate(preferences, { fresh, onEvent, signal: controller.signal });
        // The server returns validated preferences (endDate filled in, defaults applied).
        setCurrentPreferences(res.preferences ?? preferences);
        setPlanPreferences(res.preferences ?? preferences);
        setCurrentItinerary(res.data);
        setCurrentTripId(tripId);
        setIsDirty(true);
        setLastMeta(res.meta ?? null);
        setGenerationId((n) => n + 1);
        bumpPlan();
        showToast(res.meta?.cached ? `Loaded a saved AI plan for ${res.data.destination}` : `Itinerary generated for ${res.data.destination}!`);
        return res.data;
      } catch (err) {
        if (err.name === 'AbortError') {
          showToast('Planning cancelled');
        } else {
          setError(err.message || 'Something went wrong');
        }
        throw err;
      } finally {
        if (generationAbort.current === controller) {
          generationAbort.current = null;
          setLoading(false);
          setGeneration(null);
        }
      }
    },
    [showToast, bumpPlan],
  );

  /** Stop the running generation (the server stops asking the AI too). */
  const cancelGeneration = useCallback(() => generationAbort.current?.abort(), []);

  /**
   * Part 9 — a new plan for ONE day; the rest of the trip stays. The result is unsaved (banner: Save changes).
   *   pace → a different pace just for this day; note → a wish for the AI ("more relaxed")
   */
  const regenerateDay = useCallback(
    async (dayNumber, { pace, note } = {}) => {
      if (!currentItinerary || !planPreferences) return null;
      try {
        setDayLoading(dayNumber);
        setError(null);
        const res = await tripApi.regenerateDay({
          preferences: planPreferences,
          itinerary: currentItinerary,
          dayNumber,
          ...(pace && { pace }),
          ...(note?.trim() && { note: note.trim() }),
        });
        setCurrentItinerary(res.data);
        setIsDirty(true);
        setLastMeta((m) => ({ ...(m ?? {}), cached: false, notice: res.meta?.notice ?? null, ai: res.meta?.ai ?? m?.ai ?? null }));
        bumpPlan();
        showToast(`Day ${dayNumber} has a new plan${res.meta?.source === 'gemini' ? ' from Gemini' : ''}`);
        return res.data;
      } catch (err) {
        setError(`Could not change Day ${dayNumber}: ${err.message}`);
        return null;
      } finally {
        setDayLoading(null);
      }
    },
    [currentItinerary, planPreferences, bumpPlan, showToast],
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
      bumpPlan(); // a saved trip keeps its map with the trip (Part 8)
      showToast(currentTripId ? 'Trip updated!' : 'Trip successfully saved to your dashboard!');
      fetchTrips();
      return res.data;
    } catch (err) {
      setError(`Failed to save trip: ${err.message}`);
      return null;
    } finally {
      setSaving(false);
    }
  }, [currentItinerary, planPreferences, currentPreferences, currentTripId, fetchTrips, showToast, bumpPlan]);

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
          bumpPlan();
        }
        showToast('Trip deleted successfully');
      } catch (err) {
        setError(`Failed to delete trip: ${err.message}`);
      }
    },
    [currentTripId, showToast, bumpPlan],
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
      bumpPlan();
      return trip;
    } catch (err) {
      setError(err.response?.status === 404 ? 'This trip does not exist or is not yours.' : `Failed to load trip: ${err.message}`);
      return null;
    } finally {
      setTripLoading(false);
    }
  }, [bumpPlan]);

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
    bumpPlan();
    setDraftReady(Boolean(userId));
  }, [user?.id, fetchTrips, bumpPlan]);

  // ── Part 8: put the open plan on the map (place positions + road routes) ──────────────
  // The newest values, for the async map update (it must not use the values of an old render).
  const latest = useRef({});
  latest.current = { currentItinerary, currentTripId, isDirty, planRevision };
  const mapAbort = useRef(null);

  /**
   * Ask the server to locate places and make road routes for the open plan.
   * A saved, unchanged trip is updated on the server (stored with the trip);
   * an unsaved plan is updated in memory (and saved together with it later).
   *   force → ask the routing service again for days that only have estimated routes
   */
  const updateMap = useCallback(async ({ force = false, attempt = 1 } = {}) => {
    const { currentItinerary: itinerary, currentTripId: tripId, isDirty: dirty, planRevision: revision } = latest.current;
    if (!itinerary) return;
    mapAbort.current?.abort();
    const controller = new AbortController();
    mapAbort.current = controller;
    setMapStatus({ state: 'working', message: 'Preparing the map...', percent: 5 });
    const onEvent = (name, data) => {
      if (name !== 'progress' || controller.signal.aborted) return;
      const share = data.total ? data.done / data.total : 1;
      const percent = data.stage === 'places' ? 5 + share * 65 : data.stage === 'routes' ? 70 + share * 30 : 100;
      setMapStatus({ state: 'working', message: data.message, percent: Math.round(percent) });
    };
    try {
      const savedTrip = Boolean(tripId) && !dirty;
      const res = savedTrip
        ? await tripApi.updateSavedTripMap(tripId, { force, onEvent, signal: controller.signal })
        : await tripApi.updateMap(itinerary, { force, onEvent, signal: controller.signal });
      // Another plan was opened meanwhile → this answer belongs to the old one.
      if (controller.signal.aborted || latest.current.planRevision !== revision) return;
      const next = savedTrip ? (res.stale ? null : res.data.itinerary) : res.data;
      if (next) setCurrentItinerary(next);
      setMapStatus({ state: 'done', notice: next?.map?.notice ?? null });
      // Very long trips: places are located in rounds (the services allow ~1 request per second).
      if (next && res.stats?.pending > 0 && !res.stats.serviceDown && attempt < 3) updateMap({ attempt: attempt + 1 });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setMapStatus({ state: 'error', message: err.message });
    } finally {
      if (mapAbort.current === controller) mapAbort.current = null;
    }
  }, []);

  // Every newly shown plan is checked once: only missing positions / routes are fetched.
  useEffect(() => {
    if (!draftReady) return undefined;
    const itinerary = latest.current.currentItinerary;
    if (!itinerary) {
      mapAbort.current?.abort();
      setMapStatus({ state: 'idle' });
      return undefined;
    }
    if (!needsMapUpdate(itinerary)) {
      setMapStatus({ state: 'done', notice: itinerary.map?.notice ?? null });
      return undefined;
    }
    const timer = setTimeout(() => updateMap(), 300); // let the page show first
    return () => clearTimeout(timer);
  }, [planRevision, draftReady, updateMap]);

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
        generation,
        cancelGeneration,
        regenerateDay,
        dayLoading,
        mapStatus,
        updateMap,
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
