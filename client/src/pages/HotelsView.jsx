import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrip } from '../context/TripContext';
import { tripApi } from '../services/api';
import HotelCard from '../components/HotelCard';
import { Map, Bed, Filter, Search } from 'lucide-react';

export const HotelsView = () => {
  const navigate = useNavigate();
  const { currentItinerary } = useTrip();

  const destination = currentItinerary?.destination || 'Manali';
  const [hotels, setHotels] = useState(currentItinerary?.hotels || []);
  const [loading, setLoading] = useState(false);
  const [tierFilter, setTierFilter] = useState('All');

  useEffect(() => {
    const fetchHotels = async () => {
      setLoading(true);
      try {
        const res = await tripApi.getHotels(destination, tierFilter === 'All' ? 'Moderate' : tierFilter);
        if (res && res.data) {
          setHotels(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch hotels:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!currentItinerary?.hotels || tierFilter !== 'All') {
      fetchHotels();
    }
  }, [destination, tierFilter]);

  return (
    <div className="min-h-screen py-8 sm:py-10 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header matching Screen 7 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Accommodations
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Recommended Hotels in {destination}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Handpicked stays based on your budget and preferences
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/map')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors shadow-2xs"
            >
              <Map className="w-4 h-4 text-blue-600" />
              <span>View on Map</span>
            </button>
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-2">
          {['All', 'Budget', 'Moderate', 'Luxury'].map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tier)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                tierFilter === tier
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>

        {/* Hotels Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {hotels.map((hotel, idx) => (
            <HotelCard
              key={hotel.id || idx}
              hotel={hotel}
              onSelectOnMap={() => navigate('/map')}
            />
          ))}
        </div>

      </div>
    </div>
  );
};

export default HotelsView;
