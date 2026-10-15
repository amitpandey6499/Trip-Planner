import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { slugify } from '@tripplanner/shared';
import { useTrip } from '../context/TripContext';
import { destinationApi } from '../services/api';
import HotelCard from '../components/HotelCard';
import DestinationPicker from '../components/DestinationPicker';

const TIERS = ['All', 'Budget', 'Moderate', 'Luxury'];

/**
 * Part 10 — where to stay: areas with typical prices per budget tier (the tier filter really filters),
 * plus links to search real hotels with the trip's dates. ?destination=slug&budget=Budget
 */
export const HotelsView = () => {
  const [params, setParams] = useSearchParams();
  const { currentItinerary, planPreferences } = useTrip();
  const destination = params.get('destination') || slugify(currentItinerary?.destination ?? '') || 'manali';
  const budget = TIERS.includes(params.get('budget')) ? params.get('budget') : 'All';
  // Dates and group size only when the open plan is for this destination.
  const plan = currentItinerary && slugify(currentItinerary.destination) === destination ? planPreferences : null;
  const [state, setState] = useState({ items: [], info: null, loading: true, error: null });

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    destinationApi
      .stays({
        destination,
        budget,
        ...(plan?.startDate && { checkIn: plan.startDate, checkOut: plan.endDate }),
        ...(plan?.travelersCount && { travelers: plan.travelersCount }),
      })
      .then((res) => active && setState({ items: res.data, info: res.destination, loading: false, error: null }))
      .catch((err) => active && setState({ items: [], info: null, loading: false, error: err.message }));
    return () => {
      active = false;
    };
  }, [destination, budget, plan?.startDate, plan?.endDate, plan?.travelersCount]);

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen py-8 sm:py-10 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Where to stay</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Stays in {state.info?.name ?? '...'}</h1>
            <p className="text-xs sm:text-sm text-slate-500">Good areas and typical prices per budget. Search real hotels with one click.</p>
          </div>
          <DestinationPicker value={destination} onChange={(slug) => set('destination', slug)} />
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Budget">
          {TIERS.map((tier) => (
            <button
              key={tier}
              onClick={() => set('budget', tier)}
              aria-pressed={budget === tier}
              className={`px-4 py-2 rounded-xl text-xs font-semibold ${budget === tier ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            >
              {tier}
            </button>
          ))}
          {plan?.startDate && (
            <span className="text-[11px] text-slate-500 ml-1">
              Search links use your trip dates ({plan.startDate} → {plan.endDate}, {plan.travelersCount} guests).
            </span>
          )}
        </div>

        {state.error && (
          <p className="p-4 rounded-xl bg-amber-50 text-amber-900 text-xs border border-amber-200 flex items-center gap-2" role="alert">
            <AlertTriangle className="w-4 h-4" /> {state.error}
          </p>
        )}
        {state.loading ? (
          <p className="flex items-center gap-2 text-sm text-slate-500 py-10 justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> Loading stays...
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {state.items.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} />
            ))}
          </div>
        )}

        <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          Prices are typical estimates per room per night, not live rates. TripPlanner does not book hotels; the links open the search on the booking site.{' '}
          {state.info && (
            <Link to={`/destinations/${state.info.slug}`} className="underline">
              More about {state.info.name}
            </Link>
          )}
        </p>
      </div>
    </div>
  );
};

export default HotelsView;
