import { Star, MapPin } from 'lucide-react';
import { formatINR } from '@tripplanner/shared';

export const HotelCard = ({ hotel, onSelectOnMap }) => {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 flex flex-col">
      {/* Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        <img
          src={hotel.imageUrl || hotel.image}
          alt={hotel.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80';
          }}
        />

        {/* Only real ratings are shown (no made-up stars) */}
        {hotel.rating > 0 && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-white/95 backdrop-blur-xs flex items-center gap-1 shadow-xs text-xs font-bold text-slate-800">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{hotel.rating}</span>
          </div>
        )}

        {/* Budget tier */}
        {hotel.budgetTier && (
          <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-[10px] font-semibold text-white">
            {hotel.budgetTier} Tier
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {hotel.name}
          </h3>

          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 text-slate-400" />
            {hotel.address || hotel.distance || 'Central Area'}
          </p>

          {/* Amenities */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(hotel.amenities || ['Free WiFi', 'Breakfast Included']).slice(0, 3).map((amenity, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>

        {/* Price & Action */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Estimated Rate</span>
            <span className="text-base font-extrabold text-blue-600">
              {hotel.pricePerNight ? formatINR(hotel.pricePerNight) : '—'}
              <span className="text-xs font-medium text-slate-500">/night</span>
            </span>
          </div>

          <button
            onClick={() => onSelectOnMap && onSelectOnMap(hotel)}
            className="text-xs font-semibold text-slate-700 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 bg-slate-50/80 transition-colors flex items-center gap-1"
          >
            <span>View on Map</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HotelCard;
