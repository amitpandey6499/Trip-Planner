import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Heart, MapPin, Search, X } from 'lucide-react';
import { DESTINATION_CATEGORIES } from '@tripplanner/shared';
import { destinationApi } from '../services/api';
import DestinationCard from '../components/DestinationCard';
import { useAuth } from '../context/AuthContext';
import { useSystemStatus } from '../hooks/useSystemStatus';

const SORTS = [
  { value: 'popular', label: 'Popular' },
  { value: 'season', label: 'Good time to go now' },
  { value: 'budget', label: 'Budget (low → high)' },
  { value: 'name', label: 'A – Z' },
];

/**
 * Part 10 — Explore: 26 destinations from the database, categories that really filter,
 * search, sort and ❤️ favourites. Filters live in the URL (?category=Beaches&q=fort) so they can be shared.
 */
export const Explore = () => {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { status } = useSystemStatus();
  const aiOn = Boolean(status?.services?.geminiAI) || !status; // until the status is known, do not warn

  const category = params.get('category') ?? 'All';
  const sort = params.get('sort') ?? 'popular';
  const favoritesOnly = params.get('favorites') === '1';
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === null || value === '' || value === undefined) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  // Fetch when the filters change (search is debounced).
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await destinationApi.list({ q: query, category, sort });
        if (active) {
          setDestinations(res.data);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, category, sort]);

  const favorites = useMemo(() => new Set(user?.favorites ?? []), [user?.favorites]);
  const shown = favoritesOnly ? destinations.filter((d) => favorites.has(d.slug)) : destinations;

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Destination Discovery</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">Explore India</h1>
            <p className="text-sm text-slate-500 mt-1">Best season, typical daily cost and how long to stay — then plan a trip in one click.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="w-full sm:w-72 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setParam('q', e.target.value.trim());
                }}
                placeholder="Search places, forts, beaches..."
                aria-label="Search destinations"
                className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    setParam('q', null);
                  }}
                  aria-label="Clear search"
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <label className="sr-only" htmlFor="explore-sort">
              Sort destinations
            </label>
            <select
              id="explore-sort"
              value={sort}
              onChange={(e) => setParam('sort', e.target.value === 'popular' ? null : e.target.value)}
              className="py-2.5 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {DESTINATION_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setParam('category', cat === 'All' ? null : cat)}
              aria-pressed={category.toLowerCase() === cat.toLowerCase()}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                category.toLowerCase() === cat.toLowerCase()
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
          {user && (
            <button
              onClick={() => setParam('favorites', favoritesOnly ? null : '1')}
              aria-pressed={favoritesOnly}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                favoritesOnly ? 'bg-red-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-white' : ''}`} /> My favourites ({favorites.size})
            </button>
          )}
        </div>

        {error && (
          <p className="p-4 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200" role="alert">
            {error}
          </p>
        )}

        {loading && destinations.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-slate-100"></div>
            ))}
          </div>
        ) : shown.length > 0 ? (
          <>
            <p className="text-xs text-slate-500" aria-live="polite">
              {shown.length} {shown.length === 1 ? 'destination' : 'destinations'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {shown.map((dest) => (
                <DestinationCard key={dest.slug} destination={dest} aiOn={aiOn} />
              ))}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center max-w-md mx-auto border border-slate-100 shadow-soft space-y-3">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">{favoritesOnly ? 'No favourites yet' : 'No destinations found'}</h3>
            <p className="text-xs text-slate-500">
              {favoritesOnly ? 'Tap the ❤️ on a destination to save it here.' : 'Try another search or category.'}
            </p>
            <button
              onClick={() => {
                setQuery('');
                setParams({}, { replace: true });
              }}
              className="text-xs font-semibold text-blue-600 hover:underline pt-2 inline-block"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;
