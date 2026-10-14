import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Map as MapIcon } from 'lucide-react';
import { useTrip } from '../context/TripContext';
import InteractiveMap from '../components/InteractiveMap';

/** Map of the itinerary that is open right now (real road routes come in Part 8). */
export const MapView = () => {
  const { currentItinerary, currentTripId } = useTrip();
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const days = currentItinerary?.days || [];
  const currentDay = days[selectedDayIndex] || days[0];

  if (!currentDay) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-10 text-center max-w-md border border-slate-100 shadow-soft space-y-4">
          <MapIcon className="w-12 h-12 text-blue-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">No trip on the map yet</h2>
          <p className="text-sm text-slate-500">Plan a trip or open a saved one, and its daily stops will show up here.</p>
          <div className="flex gap-2 justify-center">
            <Link to="/trips/new" className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
              Plan a Trip
            </Link>
            <Link to="/my-trips" className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold">
              My Trips
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 sm:py-10 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Trip Map
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{currentItinerary.title}</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Daily stops in visiting order.{' '}
              <Link to={currentTripId ? `/trips/${currentTripId}` : '/itinerary'} className="text-blue-600 font-semibold hover:underline">
                Back to the itinerary
              </Link>
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {days.map((d, idx) => (
              <button
                key={d.dayNumber}
                onClick={() => setSelectedDayIndex(idx)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedDayIndex === idx ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Day {d.dayNumber}
              </button>
            ))}
          </div>
        </div>

        <InteractiveMap stops={currentDay.activities || []} dayTitle={`Day ${currentDay.dayNumber} - ${currentDay.title}`} />
      </div>
    </div>
  );
};

export default MapView;
