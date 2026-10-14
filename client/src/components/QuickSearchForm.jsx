import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Clock, IndianRupee, Users, Sparkles, Loader2 } from 'lucide-react';
import { useTrip } from '../context/TripContext';

const popularDestinations = [
  'Manali, Himachal Pradesh',
  'Goa, India',
  'Jaipur, Rajasthan',
  'Udaipur, Rajasthan',
  'Varanasi, Uttar Pradesh',
  'Kerala (Munnar & Alleppey)',
  'Andaman & Nicobar Islands',
  'Rishikesh, Uttarakhand'
];

export const QuickSearchForm = () => {
  const navigate = useNavigate();
  const { generateTrip, loading } = useTrip();

  const [destination, setDestination] = useState('Manali');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [startDate, setStartDate] = useState('2026-11-12');
  const [duration, setDuration] = useState('4');
  const [budget, setBudget] = useState('15000');
  const [travelers, setTravelers] = useState('2');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!destination.trim()) return;

    const cleanedDest = destination.split(',')[0].trim();
    const preferences = {
      destination: cleanedDest,
      startDate: startDate,
      durationDays: parseInt(duration, 10) || 4,
      totalBudget: parseInt(budget, 10) || 15000,
      travelersCount: parseInt(travelers, 10) || 2,
      budgetCategory: parseInt(budget, 10) < 10000 ? 'Budget' : parseInt(budget, 10) > 30000 ? 'Luxury' : 'Moderate',
      interests: ['Nature & Outdoors', 'Food & Cuisine', 'Historical Places']
    };

    try {
      await generateTrip(preferences);
      navigate('/itinerary');
    } catch (err) {
      console.error('Quick generation error:', err);
      // Fallback redirect to wizard
      navigate('/create-trip');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-100 p-4 sm:p-5 relative z-20 -mt-12 sm:-mt-16 transition-all">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 items-center">
          
          {/* Where to? */}
          <div className="relative">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              Where to?
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Enter destination"
              className="w-full text-sm font-medium text-slate-800 placeholder-slate-400 bg-slate-50/80 hover:bg-slate-100/80 focus:bg-white px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              required
            />

            {/* Autocomplete Dropdown */}
            {showSuggestions && (
              <div 
                className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto py-1"
                onMouseLeave={() => setShowSuggestions(false)}
              >
                {popularDestinations
                  .filter(d => d.toLowerCase().includes(destination.toLowerCase()))
                  .map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setDestination(item);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition-colors"
                    >
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {item}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-sm font-medium text-slate-800 bg-slate-50/80 hover:bg-slate-100/80 focus:bg-white px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer"
              required
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full text-sm font-medium text-slate-800 bg-slate-50/80 hover:bg-slate-100/80 focus:bg-white px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer"
            >
              <option value="2">2 Days (Weekend)</option>
              <option value="3">3 Days (Short Trip)</option>
              <option value="4">4 Days (Recommended)</option>
              <option value="5">5 Days</option>
              <option value="7">7 Days (Full Week)</option>
            </select>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5 text-blue-600" />
              Budget
            </label>
            <select
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full text-sm font-medium text-slate-800 bg-slate-50/80 hover:bg-slate-100/80 focus:bg-white px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer"
            >
              <option value="8000">₹8,000 (Budget)</option>
              <option value="15000">₹15,000 (Moderate)</option>
              <option value="25000">₹25,000 (Comfort)</option>
              <option value="45000">₹45,000 (Luxury)</option>
            </select>
          </div>

          {/* Travelers & Generate Button */}
          <div className="flex flex-col gap-1">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              Travelers
            </label>
            <div className="flex items-center gap-2">
              <select
                value={travelers}
                onChange={(e) => setTravelers(e.target.value)}
                className="w-1/3 text-sm font-medium text-slate-800 bg-slate-50/80 hover:bg-slate-100/80 focus:bg-white px-2 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="6">6+</option>
              </select>

              <button
                type="submit"
                disabled={loading}
                className="w-2/3 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-500/25 hover:shadow-lg transition-all active:scale-95 disabled:opacity-75 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Planning...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
};

export default QuickSearchForm;
