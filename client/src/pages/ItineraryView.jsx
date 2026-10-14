import { useState, useEffect } from 'react';
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
  Check,
  ChevronRight,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTrip } from '../context/TripContext';
import DayTimeline from '../components/DayTimeline';
import InteractiveMap from '../components/InteractiveMap';
import HotelCard from '../components/HotelCard';
import RestaurantCard from '../components/RestaurantCard';
import CostBreakdown from '../components/CostBreakdown';

export const ItineraryView = () => {
  const {
    currentItinerary,
    currentPreferences,
    saveCurrentTrip,
    generateTrip,
    saving,
    loading,
    successToast
  } = useTrip();

  const [activeTab, setActiveTab] = useState('itinerary'); // 'itinerary' | 'map' | 'hotels' | 'restaurants' | 'places' | 'cost'
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [copied, setCopied] = useState(false);

  // Trigger celebration confetti once on mount
  useEffect(() => {
    if (currentItinerary) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (e) {
        // Ignore in headless
      }
    }
  }, []);

  // If no itinerary is loaded yet, generate default Manali or redirect
  useEffect(() => {
    if (!currentItinerary && !loading) {
      generateTrip(currentPreferences).catch(() => {});
    }
  }, [currentItinerary]);

  if (loading || !currentItinerary) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <h2 className="text-xl font-bold text-slate-800">Generating Your AI Itinerary...</h2>
        <p className="text-sm text-slate-500 max-w-sm text-center">
          Gemini AI is analyzing optimal visit hours, attractions, cost distributions, and local route maps.
        </p>
      </div>
    );
  }

  const days = currentItinerary.days || [];
  const selectedDay = days.find(d => d.dayNumber === selectedDayNumber) || days[0];

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRegenerate = async () => {
    await generateTrip(currentPreferences);
  };

  return (
    <div className="min-h-screen py-8 sm:py-10 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Toast Alert */}
        {successToast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 border border-slate-700">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{successToast}</span>
          </div>
        )}

        {/* 1. TOP HEADER & CONTROLS (Screen 5) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-soft flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-500" />
                {currentItinerary.source || 'AI Itinerary'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              {currentItinerary.title || `Your Trip to ${currentItinerary.destination}`}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              {currentItinerary.summary || 'A personalized itinerary based on your preferences'}
            </p>

            {/* Badges row matching mockup */}
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                {days.length} Days
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                {currentItinerary.travelersCount || 2} Travelers
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">
                <IndianRupee className="w-3.5 h-3.5 text-blue-600" />
                ₹{(currentItinerary.totalBudget || 15000).toLocaleString()} (est.)
              </span>
            </div>
          </div>

          {/* Top Action Buttons (no-print) */}
          <div className="flex flex-wrap items-center gap-2.5 no-print">
            <button
              onClick={saveCurrentTrip}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-75 cursor-pointer"
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Trip'}</span>
            </button>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all"
              title="Share itinerary link"
            >
              <Share2 className="w-4 h-4 text-slate-500" />
              <span>{copied ? 'Copied!' : 'Share'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all"
              title="Print or Export to PDF"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>

            <button
              onClick={handleRegenerate}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all"
              title="Regenerate Itinerary"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 2. NAVIGATION TABS BAR (matching Screen 5) */}
        <div className="bg-white rounded-2xl p-1.5 border border-slate-100 shadow-soft flex items-center gap-1 overflow-x-auto no-print">
          {[
            { id: 'itinerary', label: 'Itinerary', icon: Calendar },
            { id: 'map', label: 'Map View', icon: Map },
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
                <Icon className="w-4 h-4" />
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
                            {d.title}
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
              <DayTimeline day={selectedDay} />
            </div>

          </div>
        )}

        {/* TAB B: INTERACTIVE MAP & ROUTE VIEW (Screen 6) */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            <InteractiveMap
              stops={selectedDay?.activities || []}
              dayTitle={`Day ${selectedDayNumber} - ${selectedDay?.title || 'Route'}`}
              totalDistance="98 km (approx.)"
              estimatedTime="3.5 hours"
            />
          </div>
        )}

        {/* TAB C: HOTELS (Screen 7) */}
        {activeTab === 'hotels' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Recommended Hotels in {currentItinerary.destination}
                </h3>
                <p className="text-xs text-slate-500">
                  Handpicked stays based on your budget and preferences
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
                  onSelectOnMap={() => setActiveTab('map')}
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
                  Top Restaurants in {currentItinerary.destination}
                </h3>
                <p className="text-xs text-slate-500">
                  Great food choices based on your taste and reviews
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
                  onSelectOnMap={() => setActiveTab('map')}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB E: COST BREAKDOWN */}
        {activeTab === 'cost' && (
          <CostBreakdown
            breakdown={currentItinerary.budgetBreakdown}
            totalBudget={currentItinerary.totalBudget}
            durationDays={days.length}
          />
        )}

      </div>
    </div>
  );
};

export default ItineraryView;
