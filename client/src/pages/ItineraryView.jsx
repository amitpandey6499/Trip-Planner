import { useEffect, useState } from 'react';
import {
  Calendar,
  Users,
  IndianRupee,
  BookmarkCheck,
  Share2,
  Printer,
  RefreshCw,
  Clock,
  Sparkles,
  Bed,
  Utensils,
  Map,
  PieChart,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Pencil,
  Info,
  Database,
  Undo2,
  Loader2,
} from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { ITINERARY_SOURCES, LIMITS, addDays, formatDate, formatINR, todayIso } from '@tripplanner/shared';
import { useTrip } from '../context/TripContext';
import { useTripFromUrl } from '../hooks/useTripFromUrl';
import { PageLoader, TripNotFound } from '../components/PageState';
import { useSystemStatus } from '../hooks/useSystemStatus';
import DayTimeline from '../components/DayTimeline';
import InteractiveMap from '../components/InteractiveMap';
import HotelCard from '../components/HotelCard';
import RestaurantCard from '../components/RestaurantCard';
import CostBreakdown from '../components/CostBreakdown';

/** Plain-text version of the itinerary for the clipboard (real share links come in Part 14). */
const itineraryAsText = (it) =>
  [
    `${it.title}`,
    `${it.durationDays} days • ${it.travelersCount} travelers • Est. ${formatINR(it.estimatedTotal)}`,
    '',
    ...it.days.flatMap((day) => [
      `Day ${day.dayNumber}${day.date ? ` (${formatDate(day.date)})` : ''}: ${day.title}`,
      ...day.activities.map((a) => `  - ${a.timeSlot ? `${a.timeSlot} ` : ''}${a.placeName}${a.cost ? ` (${formatINR(a.cost)})` : ''}`),
      '',
    ]),
  ].join('\n');

// Confetti only for a plan that was just generated (not when a saved trip is opened or the page is refreshed).
let lastCelebratedGeneration = 0;

/**
 * /trips/:id   → a saved trip (loaded from the server; survives refresh, can be bookmarked)
 * /itinerary   → a new plan that is not saved yet (kept in this tab's session draft)
 */
export const ItineraryView = () => {
  const { id } = useParams();
  const { currentTripId, draftReady, error } = useTrip();
  const status = useTripFromUrl(id);

  // The draft page only holds unsaved plans: once saved (or a saved trip is open) use its own URL.
  if (!id && draftReady && currentTripId) return <Navigate to={`/trips/${currentTripId}`} replace />;
  if (status === 'loading') return <PageLoader title="Loading your trip..." />;
  if (status === 'missing') return <TripNotFound message={error} />;
  return <ItineraryPage />;
};

const ItineraryPage = () => {
  const navigate = useNavigate();
  const {
    currentItinerary,
    planPreferences,
    currentTripId,
    isDirty,
    lastMeta,
    generationId,
    saveCurrentTrip,
    generateTrip,
    loadTripById,
    tripLoading,
    saving,
    loading,
    error,
    regenerateDay,
    dayLoading,
    mapStatus,
    updateMap,
  } = useTrip();
  const { status: systemStatus } = useSystemStatus();
  const aiOn = Boolean(systemStatus?.services?.geminiAI);

  const [activeTab, setActiveTab] = useState('itinerary'); // 'itinerary' | 'map' | 'hotels' | 'restaurants' | 'cost'
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [copied, setCopied] = useState(false);
  // "View on Map" from a stay / restaurant card: { kind: 'stay' | 'food', id, at }
  const [mapFocus, setMapFocus] = useState(null);
  const showOnMap = (kind) => (place) => {
    setMapFocus({ kind, id: place.id, at: Date.now() });
    setActiveTab('map');
  };

  // A new plan (or a different trip) starts at day 1.
  useEffect(() => {
    setSelectedDayNumber(1);
  }, [generationId, currentTripId]);

  useEffect(() => {
    if (!generationId || generationId <= lastCelebratedGeneration) return;
    lastCelebratedGeneration = generationId;
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch {
      // canvas not available (e.g. headless browser) — not important
    }
  }, [generationId]);

  // (While a plan is being made, the progress window is shown on top — GenerationOverlay.)
  if (loading && !currentItinerary) {
    return (
      <PageLoader
        title="Building your itinerary..."
        text="Planning visit times, costs, stays and restaurants for each day. With AI this can take up to a minute."
      />
    );
  }

  // Opening /itinerary directly does not generate anything: show what to do instead.
  if (!currentItinerary) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-10 text-center max-w-md border border-slate-100 shadow-soft space-y-4">
          <Sparkles className="w-12 h-12 text-blue-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">No itinerary open</h2>
          <p className="text-sm text-slate-500">Create a new trip or open one of your saved trips.</p>
          <div className="flex gap-2 justify-center">
            <Link to="/trips/new" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
              <Plus className="w-4 h-4" /> Create a Trip
            </Link>
            <Link to="/my-trips" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold">
              My Trips
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const days = currentItinerary.days || [];
  const selectedDay = days.find((d) => d.dayNumber === selectedDayNumber) || days[0];
  const isSaved = Boolean(currentTripId);
  const editPath = isSaved ? `/trips/${currentTripId}/edit` : '/trips/new';
  // An unsaved plan is edited in the "new trip" wizard, filled with THIS plan's preferences.
  const editState = isSaved ? undefined : { fromPlan: true };
  // The server refuses plans that start in the past, so an old trip needs new dates first.
  const planStart = planPreferences?.startDate ?? currentItinerary.startDate;
  const datesInPast = !planStart || planStart < addDays(todayIso(), -LIMITS.PAST_DATE_GRACE_DAYS);
  const aiLeft = lastMeta?.ai ? lastMeta.ai.left : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(itineraryAsText(currentItinerary));
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    // On /itinerary the page then moves to /trips/:id by itself (see ItineraryView).
    await saveCurrentTrip();
  };

  const handleRegenerate = () => {
    if (datesInPast || !planPreferences) {
      navigate(editPath, { state: editState });
      return;
    }
    // fresh: skip the AI cache. tripId: "Update Trip" then overwrites the saved trip (no duplicate).
    // planPreferences = what THIS plan was made with (not whatever the wizard was last filled with).
    generateTrip(planPreferences, { tripId: currentTripId, fresh: true }).catch(() => {});
  };

  const handleDiscard = () => {
    loadTripById(currentTripId);
  };

  const overBudgetBy = currentItinerary.withinBudget ? 0 : currentItinerary.estimatedTotal - currentItinerary.totalBudget;

  return (
    <div className="min-h-screen py-8 sm:py-10 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-6">

        {error && (
          <div className="p-4 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2 no-print" role="alert">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Why this plan did not come from the AI (limit reached, AI unreachable ...) */}
        {lastMeta?.notice && (
          <div className="p-4 rounded-xl bg-amber-50 text-amber-900 text-xs border border-amber-200 flex items-start gap-2 no-print" role="status">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{lastMeta.notice}</span>
          </div>
        )}

        {isDirty && isSaved && (
          <div
            className="p-4 rounded-xl bg-blue-50 text-blue-900 text-xs border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print"
            role="status"
            data-testid="unsaved-banner"
          >
            <span className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-blue-600" />
              This is a new version of your saved trip. It is not saved yet.
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleDiscard}
                disabled={tripLoading || saving}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-200 bg-white hover:bg-blue-100/50 font-semibold disabled:opacity-60"
              >
                <Undo2 className="w-3.5 h-3.5" /> {tripLoading ? 'Restoring...' : 'Discard changes'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-60"
              >
                <BookmarkCheck className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        )}

        {/* 1. TOP HEADER & CONTROLS */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-soft flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-500" />
                {ITINERARY_SOURCES[currentItinerary.source] ?? 'Itinerary'}
              </span>
              {lastMeta?.cached && (
                <span
                  className="text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1"
                  title="The same request was answered earlier, so it was loaded instantly. Use Regenerate for a fresh plan."
                >
                  <Database className="w-3 h-3" /> From cache
                </span>
              )}
              {!isSaved && (
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                  Not saved yet
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              {currentItinerary.title || `Your Trip to ${currentItinerary.destination}`}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              {currentItinerary.summary || 'A personalized itinerary based on your preferences'}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                {days.length} {days.length === 1 ? 'Day' : 'Days'}
                {currentItinerary.startDate && ` • ${formatDate(currentItinerary.startDate)}`}
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                {currentItinerary.travelersCount} {currentItinerary.travelersCount === 1 ? 'Traveler' : 'Travelers'}
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">
                <IndianRupee className="w-3.5 h-3.5 text-blue-600" />
                Est. {formatINR(currentItinerary.estimatedTotal)}
                {currentItinerary.totalBudget > 0 && <span className="font-normal text-slate-500">of {formatINR(currentItinerary.totalBudget)} budget</span>}
              </span>

              {currentItinerary.totalBudget > 0 &&
                (currentItinerary.withinBudget ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Within budget
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60">
                    <AlertTriangle className="w-3.5 h-3.5" /> Over budget by {formatINR(overBudgetBy)}
                  </span>
                ))}
            </div>
          </div>

          {/* Top Action Buttons (no-print) */}
          <div className="flex flex-col items-start lg:items-end gap-2 no-print">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleSave}
                disabled={saving || (isSaved && !isDirty)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-75 disabled:active:scale-100"
              >
                {isSaved && !isDirty ? <CheckCircle2 className="w-4 h-4" /> : <BookmarkCheck className="w-4 h-4" />}
                <span>{saving ? 'Saving...' : !isSaved ? 'Save Trip' : isDirty ? 'Update Trip' : 'Saved'}</span>
              </button>

              <Link
                to={editPath}
                state={editState}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all"
                title="Change destination, dates, budget or preferences"
              >
                <Pencil className="w-4 h-4 text-slate-500" />
                <span>Edit</span>
              </Link>

              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all"
                title="Copy the itinerary as text"
              >
                <Share2 className="w-4 h-4 text-slate-500" />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all"
                title="Print this page (full PDF export comes in Part 14)"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">Print</span>
              </button>

              <button
                onClick={handleRegenerate}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all"
                title={datesInPast ? 'These dates are in the past: pick new dates first' : 'Make a fresh plan with the same preferences'}
                aria-label="Regenerate itinerary"
              >
                <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Regenerate</span>
              </button>
            </div>
            {aiLeft !== null && (
              <p className="text-[11px] text-slate-500" data-testid="ai-left">
                {aiLeft} of {lastMeta.ai.limit} AI plans left today
              </p>
            )}
          </div>
        </div>

        {/* 2. NAVIGATION TABS BAR (matching Screen 5) */}
        <div className="bg-white rounded-2xl p-1.5 border border-slate-100 shadow-soft flex items-center gap-1 overflow-x-auto no-print">
          {[
            { id: 'itinerary', label: 'Itinerary', icon: Calendar },
            { id: 'map', label: mapStatus.state === 'working' ? 'Map View…' : 'Map View', icon: mapStatus.state === 'working' ? Loader2 : Map },
            { id: 'hotels', label: 'Hotels', icon: Bed },
            { id: 'restaurants', label: 'Restaurants', icon: Utensils },
            { id: 'cost', label: 'Cost Breakdown', icon: PieChart },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${Icon === Loader2 ? 'animate-spin' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 3. TAB CONTENT */}

        {/* TAB A: ITINERARY TIMELINE (Day Selector on left, timeline on right) */}
        {activeTab === 'itinerary' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Day Selector Sidebar (matching Screen 5) */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-soft space-y-3 no-print">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                Trip Timeline Days
              </span>

              <div className="space-y-2">
                {days.map((d) => {
                  const isSelected = d.dayNumber === selectedDayNumber;

                  return (
                    <button
                      key={d.dayNumber}
                      onClick={() => setSelectedDayNumber(d.dayNumber)}
                      className={`w-full text-left p-3.5 rounded-xl transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-50/90 text-blue-900 border-2 border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {d.dayNumber}
                        </span>
                        <div>
                          <p className="font-bold text-xs sm:text-sm">Day {d.dayNumber}</p>
                          <p className="text-[11px] text-slate-500 truncate max-w-[170px]">
                            {d.date ? `${formatDate(d.date)} • ` : ''}{d.title}
                          </p>
                        </div>
                      </div>

                      <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                    </button>
                  );
                })}
              </div>

              {/* Quick Jump to Hotels & Map */}
              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => setActiveTab('map')}
                  className="w-1/2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <Map className="w-3.5 h-3.5" />
                  <span>View Map</span>
                </button>
                <button
                  onClick={() => setActiveTab('hotels')}
                  className="w-1/2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <Bed className="w-3.5 h-3.5" />
                  <span>Stays</span>
                </button>
              </div>
            </div>

            {/* Right Day Details Timeline */}
            <div className="lg:col-span-8">
              <DayTimeline
                day={selectedDay}
                aiOn={aiOn}
                onRegenerate={regenerateDay}
                regenerating={dayLoading === selectedDay?.dayNumber}
                regenerateBlocked={
                  datesInPast
                    ? 'These dates are in the past: change them with Edit first.'
                    : loading || dayLoading
                      ? 'Please wait for the current plan to finish.'
                      : null
                }
              />
            </div>

          </div>
        )}

        {/* TAB B: INTERACTIVE MAP & ROUTE VIEW (Screen 6) */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 overflow-x-auto no-print" aria-label="Choose a day">
              {days.map((d) => (
                <button
                  key={d.dayNumber}
                  onClick={() => setSelectedDayNumber(d.dayNumber)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    d.dayNumber === selectedDay?.dayNumber ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Day {d.dayNumber}
                </button>
              ))}
            </div>
            <InteractiveMap
              day={selectedDay}
              hotels={currentItinerary.hotels}
              restaurants={currentItinerary.restaurants}
              focus={mapFocus}
              mapStatus={mapStatus}
              onRetryRoutes={() => updateMap({ force: true })}
              title={`Day ${selectedDay?.dayNumber ?? 1} - ${selectedDay?.title || 'Route'}`}
            />
          </div>
        )}

        {/* TAB C: HOTELS (Screen 7) */}
        {activeTab === 'hotels' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Where to stay in {currentItinerary.destination}
                </h3>
                <p className="text-xs text-slate-500">
                  Stays that fit your budget tier. Prices are estimates per room per night — check before booking.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('map')}
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                <Map className="w-3.5 h-3.5" />
                <span>View on Map</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(currentItinerary.hotels || []).map((hotel, idx) => (
                <HotelCard
                  key={hotel.id || idx}
                  hotel={hotel}
                  onSelectOnMap={showOnMap('stay')}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB D: RESTAURANTS (Screen 8) */}
        {activeTab === 'restaurants' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Where to eat in {currentItinerary.destination}
                </h3>
                <p className="text-xs text-slate-500">
                  Places to eat that match your food preference. Costs are estimates.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('map')}
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                <Map className="w-3.5 h-3.5" />
                <span>View on Map</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(currentItinerary.restaurants || []).map((restaurant, idx) => (
                <RestaurantCard
                  key={restaurant.id || idx}
                  restaurant={restaurant}
                  onSelectOnMap={showOnMap('food')}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB E: COST BREAKDOWN */}
        {activeTab === 'cost' && (
          <CostBreakdown itinerary={currentItinerary} />
        )}

      </div>
    </div>
  );
};

export default ItineraryView;
