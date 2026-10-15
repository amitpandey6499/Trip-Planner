import { ExternalLink, MapPin, Utensils } from 'lucide-react';
import { formatINR } from '@tripplanner/shared';

/** A place to eat (curated, offline planner or AI plan). Only facts we have; costs are labelled as estimates. */
export const RestaurantCard = ({ restaurant, links = restaurant.links, onSelectOnMap }) => (
  <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-soft hover:shadow-soft-lg transition-all duration-300 flex flex-col" data-testid="eatery-card">
    <div className="relative h-14 bg-gradient-to-r from-amber-50 to-orange-50">
      <Utensils className="w-5 h-5 text-amber-600 absolute left-4 top-4" aria-hidden="true" />
      {restaurant.veg && <span className="absolute right-3 top-4 text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded">PURE VEG</span>}
    </div>
    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
      <div>
        <h3 className="text-base font-bold text-slate-900">{restaurant.name}</h3>
        {restaurant.cuisine && <p className="text-xs text-blue-700 font-medium mt-1">{restaurant.cuisine}</p>}
        {(restaurant.address || restaurant.area) && (
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 text-slate-400" />
            {restaurant.address || restaurant.area}
          </p>
        )}
        {restaurant.dietaryTags?.filter((t) => t !== 'Pure vegetarian').length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {restaurant.dietaryTags
              .filter((t) => t !== 'Pure vegetarian')
              .slice(0, 3)
              .map((tag) => (
                <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/50">
                  {tag}
                </span>
              ))}
          </div>
        )}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Meal for two</span>
          <span className="text-sm font-bold text-slate-800">
            {restaurant.costForTwo > 0 ? `≈ ${formatINR(restaurant.costForTwo)}` : restaurant.priceNote === 'Free' ? 'Free' : '—'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {links?.maps && (
            <a href={links.maps} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 border border-slate-200 hover:border-blue-300 px-3 py-1.5 rounded-lg">
              Google Maps <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {onSelectOnMap && restaurant.coordinates && (
            <button onClick={() => onSelectOnMap(restaurant)} className="text-xs font-semibold text-slate-700 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300">
              View on Map
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);

export default RestaurantCard;
