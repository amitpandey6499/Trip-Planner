import { Star, MapPin, Utensils } from 'lucide-react';
import { formatINR } from '@tripplanner/shared';

export const RestaurantCard = ({ restaurant, onSelectOnMap }) => {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 flex flex-col">
      {/* Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        <img
          src={restaurant.imageUrl || restaurant.image}
          alt={restaurant.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80';
          }}
        />

        {/* Rating */}
        <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-white/95 backdrop-blur-xs flex items-center gap-1 shadow-xs text-xs font-bold text-slate-800">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>{restaurant.rating || 4.6}</span>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {restaurant.name}
          </h3>

          <p className="text-xs text-blue-600 font-medium flex items-center gap-1 mt-1">
            <Utensils className="w-3 h-3 text-blue-500" />
            {restaurant.cuisine || 'Multi-Cuisine'}
          </p>

          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 text-slate-400" />
            {restaurant.address || restaurant.distance || 'Central Area'}
          </p>

          {/* Dietary tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(restaurant.dietaryTags || ['Veg Friendly', 'Popular']).slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/50"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Cost & Action */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Average Cost</span>
            <span className="text-sm font-bold text-slate-800">
              {restaurant.costForTwo ? formatINR(restaurant.costForTwo) : '—'}{' '}
              <span className="text-[11px] font-normal text-slate-500">for two</span>
            </span>
          </div>

          <button
            onClick={() => onSelectOnMap && onSelectOnMap(restaurant)}
            className="text-xs font-semibold text-slate-700 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 bg-slate-50/80 transition-colors flex items-center gap-1"
          >
            <span>View on Map</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestaurantCard;
