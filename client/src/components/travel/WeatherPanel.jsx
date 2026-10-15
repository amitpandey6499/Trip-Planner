import { AlertTriangle, Loader2 } from 'lucide-react';
import { formatDate } from '@tripplanner/shared';
import WeatherIcon from './WeatherIcon';

const KIND_LABEL = { forecast: 'Forecast', typical: 'Typical', actual: 'Was', missing: '—' };

/** Part 11 — one card per day: forecast (next 16 days), typical weather (later), or what it actually was (past). */
export const WeatherPanel = ({ weather, compact = false }) => {
  const { data, loading, error } = weather;
  if (loading && !data) {
    return (
      <p className="text-xs text-slate-500 flex items-center gap-1.5 p-4" role="status">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading the weather...
      </p>
    );
  }
  if (error) {
    return (
      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-1.5" role="status">
        <AlertTriangle className="w-4 h-4" /> Weather is not available right now: {error}
      </p>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-3" data-testid="weather-panel">
      <div className={`grid gap-2 ${compact ? 'grid-cols-3 sm:grid-cols-7' : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7'}`}>
        {data.days.map((day) => (
          <div key={day.date} className="rounded-xl border border-slate-200 bg-white p-3 text-center" data-testid="weather-day">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{KIND_LABEL[day.kind] ?? day.kind}</p>
            <p className="text-xs font-semibold text-slate-700">{formatDate(day.date)}</p>
            <WeatherIcon icon={day.icon} className="w-7 h-7 mx-auto my-1.5" />
            <p className="text-[11px] text-slate-600">{day.summary}</p>
            {Number.isFinite(day.tMax) && (
              <p className="text-sm font-bold text-slate-900 mt-1">
                {Math.round(day.tMax)}° <span className="text-slate-400 font-semibold">/ {Math.round(day.tMin)}°</span>
              </p>
            )}
            {Number.isFinite(day.rainChance) && (
              <p className="text-[10px] text-blue-700 mt-0.5" title={day.kind === 'typical' ? `Rain on these dates in ${day.rainyYears} of the last ${day.years} years` : 'Chance of rain'}>
                {day.kind === 'typical' ? `Rain ${day.rainyYears}/${day.years} yrs` : `${day.rainChance}% rain`}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="text-[11px] text-slate-500 space-y-0.5">
        <p>
          Weather for {data.location.name}. {data.notes.join(' ')}
        </p>
        <p>
          <a href={data.attribution.url} target="_blank" rel="noopener noreferrer" className="underline">
            {data.attribution.text}
          </a>{' '}
          ({data.attribution.license})
        </p>
      </div>
    </div>
  );
};

export default WeatherPanel;
