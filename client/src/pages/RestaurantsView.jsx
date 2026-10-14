import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrip } from '../context/TripContext';
import { tripApi } from '../services/api';
import RestaurantCard from '../components/RestaurantCard';
import { Map, Utensils } from 'lucide-react';

export const RestaurantsView = () => {
  const navigate = useNavigate();
  const { currentItinerary } = useTrip();

  const destination = currentItinerary?.destination || 'Manali';
  const [restaurants, setRestaurants] = useState(currentItinerary?.restaurants || []);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await tripApi.getRestaurants(destination);
        if (res && res.data) {
          setRestaurants(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch restaurants:', err);
      }
    };

    if (!currentItinerary?.restaurants) {
      fetchRestaurants();
    }
  }, [destination]);

  return (
    <div className="min-h-screen py-8 sm:py-10 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header matching Screen 8 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Dining & Gastronomy
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Top Restaurants in {destination}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Great food choices based on your taste and reviews
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

        {/* Restaurants Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {restaurants.map((restaurant, idx) => (
            <RestaurantCard
              key={restaurant.id || idx}
              restaurant={restaurant}
              onSelectOnMap={() => navigate('/map')}
            />
          ))}
        </div>

      </div>
    </div>
  );
};

export default RestaurantsView;
