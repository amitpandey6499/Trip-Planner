import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Info, Loader2, Leaf } from 'lucide-react';
import { slugify } from '@tripplanner/shared';
import { useTrip } from '../context/TripContext';
import { destinationApi } from '../services/api';
import RestaurantCard from '../components/RestaurantCard';
import DestinationPicker from '../components/DestinationPicker';

/** Part 10 — well-known places to eat, with a pure-veg filter. ?destination=slug&veg=1 */
export const RestaurantsView = () => {
  const [params, setParams] = useSearchParams();
  const { currentItinerary } = useTrip();
  const destination = params.get('destination') || slugify(currentItinerary?.destination ?? '') || 'manali';
  const veg = params.get('veg') === '1';
  const [state, setState] = useState({ items: [], info: null, note: null, loading: true, error: null });

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    destinationApi
      .restaurants({ destination, ...(veg && { veg: 1 }) })
      .then((res) => active && setState({ items: res.data, info: res.destination, note: res.note, loading: false, error: null }))
      .catch((err) => active && setState({ items: [], info: null, note: null, loading: false, error: err.message }));
    return () => {
      active = false;
    };
  }, [destination, veg]);

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen py-8 sm:py-10 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Where to eat</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Food in {state.info?.name ?? '...'}</h1>
            <p className="text-xs sm:text-sm text-slate-500">Well-known places, with what they serve and a typical cost for two.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => set('veg', veg ? null : '1')}
              aria-pressed={veg}
              className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${veg ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}
            >
              <Leaf className="w-3.5 h-3.5" /> Pure veg only
            </button>
            <DestinationPicker value={destination} onChange={(slug) => set('destination', slug)} />
          </div>
        </div>

        {state.error && (
          <p className="p-4 rounded-xl bg-amber-50 text-amber-900 text-xs border border-amber-200 flex items-center gap-2" role="alert">
            <AlertTriangle className="w-4 h-4" /> {state.error}
          </p>
        )}
        {state.loading ? (
          <p className="flex items-center gap-2 text-sm text-slate-500 py-10 justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> Loading places to eat...
          </p>
        ) : state.items.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {state.items.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        ) : (
          <p className="p-6 text-center text-sm text-slate-500 bg-white rounded-2xl border border-slate-100">
            {state.note ?? (veg ? 'No pure-veg places in our list here yet.' : 'No places in our list yet.')}
          </p>
        )}

        <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          Costs are estimates. Places can close or change — check timings on Google Maps before you go.{' '}
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

export default RestaurantsView;
