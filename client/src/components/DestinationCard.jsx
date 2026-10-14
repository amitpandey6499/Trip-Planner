import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Heart, MapPin, ArrowRight, Eye } from 'lucide-react';
import { useTrip } from '../context/TripContext';

export const DestinationCard = ({ destination, onQuickView }) => {
  const navigate = useNavigate();
  const { setCurrentPreferences } = useTrip();
  const [isFavorited, setIsFavorited] = useState(false);

  const handlePlanTrip = () => {
    setCurrentPreferences(prev => ({
      ...prev,
      destination: destination.name,
      interests: destination.tags || ['Nature & Outdoors']
    }));
    navigate('/create-trip');
  };

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 flex flex-col">
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <img
          src={destination.image}
          alt={destination.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80';
          }}
        />

        {/* Favorite Heart Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsFavorited(!isFavorited);
          }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-slate-700 hover:text-red-500 shadow-sm transition-colors"
          title="Save destination"
        >
          <Heart className={`w-4 h-4 transition-colors ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
        </button>

        {/* Rating Badge */}
        <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-white/95 backdrop-blur-xs flex items-center gap-1 shadow-xs text-xs font-bold text-slate-800">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>{destination.rating || 4.7}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                {destination.name}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400" />
                {destination.region}, {destination.country}
              </p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(destination.tags || []).slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          {onQuickView && (
            <button
              onClick={() => onQuickView(destination)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 py-1.5 px-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Details
            </button>
          )}

          <button
            onClick={handlePlanTrip}
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 py-1.5 px-3 rounded-lg shadow-xs hover:shadow transition-all"
          >
            <span>Plan Trip</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DestinationCard;
