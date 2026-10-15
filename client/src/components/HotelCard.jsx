import { useState } from 'react';
import { Bed, ExternalLink, MapPin, Star } from 'lucide-react';
import { formatINR } from '@tripplanner/shared';

/**
 * A stay: an AREA with a typical price (curated / offline / AI plan) or a real hotel (Google Places,
 * with Google's own rating). Nothing is made up: no default amenities, no fake rating, no stock photo.
 */
export const HotelCard = ({ hotel, links = hotel.links, onSelectOnMap }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = hotel.imageUrl && !imageFailed;
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-soft hover:shadow-soft-lg transition-all duration-300 flex flex-col" data-testid="stay-card">
      <div className={`relative w-full ${hasImage ? 'aspect-[16/10]' : 'h-16'} overflow-hidden bg-gradient-to-r from-emerald-50 to-blue-50`}>
        {hasImage ? (
          <img src={hotel.imageUrl} alt={hotel.name} className="w-full h-full object-cover" loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <Bed className="w-6 h-6 text-emerald-600 absolute left-4 top-5" aria-hidden="true" />
        )}
        {hotel.rating > 0 && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-white/95 flex items-center gap-1 shadow-xs text-xs font-bold text-slate-800" title={`Rating from ${hotel.ratingSource ?? 'the source'}`}>
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{hotel.rating}</span>
            {hotel.ratingCount > 0 && <span className="font-normal text-slate-500">({hotel.ratingCount})</span>}
            {hotel.ratingSource && <span className="font-normal text-slate-500">{hotel.ratingSource}</span>}
          </div>
        )}
        {hotel.budgetTier && (
          <span className={`absolute ${hasImage ? 'bottom-3' : 'top-4'} right-3 px-2 py-0.5 rounded-md bg-slate-900/80 text-[10px] font-semibold text-white`}>{hotel.budgetTier}</span>
        )}
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">{hotel.name}</h3>
          {(hotel.address || hotel.area) && (
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              {hotel.address || hotel.area}
            </p>
          )}
          {hotel.amenities?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {hotel.amenities.slice(0, 4).map((amenity) => (
                <span key={amenity} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  {amenity}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Typical price</span>
            <span className="text-base font-extrabold text-blue-600">
              {hotel.pricePerNight ? formatINR(hotel.pricePerNight) : 'Check on the booking site'}
              {hotel.pricePerNight ? <span className="text-xs font-medium text-slate-500"> /room/night</span> : null}
            </span>
            {hotel.pricePerNight > 0 && <span className="block text-[10px] text-slate-400">Estimate — real prices vary by date</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {links?.booking && (
              <a href={links.booking} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg">
                Search on Booking.com <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {links?.maps && (
              <a href={links.maps} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 border border-slate-200 hover:border-blue-300 px-3 py-1.5 rounded-lg">
                Google Maps <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {onSelectOnMap && hotel.coordinates && (
              <button onClick={() => onSelectOnMap(hotel)} className="text-xs font-semibold text-slate-700 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300">
                View on Map
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelCard;
