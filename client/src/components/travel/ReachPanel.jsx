import { useEffect, useId, useState } from 'react';
import { AlertTriangle, Bus, Car, ExternalLink, Loader2, MapPin, Plane, Ship, Star, TrainFront } from 'lucide-react';
import { ORIGIN_CITIES, formatDuration } from '@tripplanner/shared';
import { travelApi } from '../../services/api';

// The last city used is remembered in this browser (a convenience only).
const LAST_CITY_KEY = 'tripplanner:origin-city';
const readLastCity = () => {
  try {
    return localStorage.getItem(LAST_CITY_KEY) ?? '';
  } catch {
    return '';
  }
};
const saveLastCity = (city) => {
  try {
    localStorage.setItem(LAST_CITY_KEY, city);
  } catch {
    // storage blocked: fine
  }
};

const MODE_ICON = { flight: Plane, train: TrainFront, bus: Bus, car: Car, ship: Ship, local: MapPin };

/**
 * Part 11 — "How to reach" from the traveller's city: flight / train / bus / car with estimated times
 * and links to the real search pages. The city is remembered with the trip (onCityChange).
 */
export const ReachPanel = ({ destination, date, travelers = 2, initialCity = '', onCityChange }) => {
  const listId = useId();
  const [city, setCity] = useState(() => initialCity || readLastCity());
  const [asked, setAsked] = useState(() => initialCity || readLastCity());
  const [state, setState] = useState({ data: null, loading: false, error: null });

  useEffect(() => {
    if (!asked || !destination) return undefined;
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    travelApi
      .reach({ from: asked, to: destination, ...(date && { date }), travelers })
      .then((res) => active && setState({ data: res.data, loading: false, error: null }))
      .catch((err) => active && setState({ data: null, loading: false, error: err.message }));
    return () => {
      active = false;
    };
  }, [asked, destination, date, travelers]);

  const submit = (e) => {
    e.preventDefault();
    const value = city.trim();
    if (!value) return;
    setAsked(value);
    saveLastCity(value);
    onCityChange?.(value);
  };

  const { data, loading, error } = state;
  return (
    <div className="space-y-4" data-testid="reach-panel">
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <label htmlFor={`${listId}-city`} className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Starting from
          </label>
          <input
            id={`${listId}-city`}
            list={`${listId}-cities`}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Your city, e.g. Delhi"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <datalist id={`${listId}-cities`}>
            {ORIGIN_CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.state}
              </option>
            ))}
          </datalist>
        </div>
        <button type="submit" className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
          Show routes
        </button>
      </form>

      {loading && (
        <p className="text-xs text-slate-500 flex items-center gap-1.5" role="status">
          <Loader2 className="w-4 h-4 animate-spin" /> Finding the ways to get there...
        </p>
      )}
      {error && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-1.5" role="alert">
          <AlertTriangle className="w-4 h-4" /> {error}
        </p>
      )}

      {data && !loading && (
        <>
          <p className="text-xs text-slate-500">
            {data.from.name} → {data.to.name}: about {Math.round(data.straightKm)} km in a straight line
            {data.road && `, ${Math.round(data.road.km)} km by road${data.road.source === 'estimate' ? ' (estimate)' : ''}`}.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.options.map((option) => {
              const Icon = MODE_ICON[option.mode] ?? MapPin;
              return (
                <div
                  key={option.mode}
                  className={`rounded-2xl border p-4 bg-white space-y-2 ${option.recommended ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'}`}
                  data-testid={`reach-${option.mode}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-slate-900 flex items-center gap-2">
                      <Icon className="w-5 h-5 text-blue-600" /> {option.title}
                    </p>
                    {option.recommended && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" /> Best fit
                      </span>
                    )}
                  </div>
                  {option.durationMin > 0 && <p className="text-xs font-semibold text-slate-700">≈ {formatDuration(option.durationMin)} door to door</p>}
                  <ul className="text-xs text-slate-600 list-disc pl-4 space-y-0.5">
                    {option.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                  {option.note && <p className="text-[11px] text-slate-500">{option.note}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {option.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                      >
                        {link.label} <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <ul className="text-[11px] text-slate-500 space-y-0.5">
            {data.notes.map((note) => (
              <li key={note}>• {note}</li>
            ))}
          </ul>
        </>
      )}
      {!asked && <p className="text-xs text-slate-500">Choose your city to see flights, trains, buses and the road route.</p>}
    </div>
  );
};

export default ReachPanel;
