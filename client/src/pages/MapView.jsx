import React, { useState } from 'react';
import { useTrip } from '../context/TripContext';
import InteractiveMap from '../components/InteractiveMap';
import { ChevronRight, Calendar, Compass } from 'lucide-react';

export const MapView = () => {
  const { currentItinerary } = useTrip();
  const [selectedDayIndex, setSelectedDayIndex] = useState(1); // Default to Day 2 matching Screen 6

  const days = currentItinerary?.days || [];
  const currentDay = days[selectedDayIndex] || days[0];

  return (
    <div className="min-h-screen py-8 sm:py-10 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Interactive Navigation
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Route & Map Exploration
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Interactive waypoints, driving distance, and visual paths
            </p>
          </div>

          {/* Day Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {days.map((d, idx) => (
              <button
                key={d.dayNumber}
                onClick={() => setSelectedDayIndex(idx)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedDayIndex === idx
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Day {d.dayNumber}
              </button>
            ))}
          </div>
        </div>

        {/* Map Component */}
        <InteractiveMap
          stops={currentDay?.activities || []}
          dayTitle={`Day ${currentDay?.dayNumber || 2} - ${currentDay?.title || 'Solang Valley'}`}
          totalDistance={selectedDayIndex === 1 ? '98 km (approx.)' : '45 km (approx.)'}
          estimatedTime={selectedDayIndex === 1 ? '3.5 hours' : '2.0 hours'}
        />

      </div>
    </div>
  );
};

export default MapView;
