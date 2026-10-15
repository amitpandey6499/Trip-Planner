import { useMemo, useState } from 'react';
import { Clock, MapPin, IndianRupee, Lightbulb, Compass, RefreshCw, Loader2, Navigation, Car } from 'lucide-react';
import { LIMITS, TRAVEL_STYLES, formatDate, formatDuration, formatINR, formatKm, mapStops } from '@tripplanner/shared';
import WeatherIcon from './travel/WeatherIcon';

/**
 * One day of the itinerary. Part 8: the drive between stops comes from the day's road route.
 * Part 9: "New plan for this day" re-plans only this day (optional pace + wish for the AI).
 */
const RegeneratePanel = ({ day, aiOn, onSubmit, onClose }) => {
  const [pace, setPace] = useState('');
  const [note, setNote] = useState('');
  return (
    <form
      className="mt-4 p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-3 no-print"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ pace: pace || undefined, note: aiOn ? note : undefined });
      }}
      data-testid="regenerate-day-panel"
    >
      <p className="text-xs font-bold text-slate-800">New plan for Day {day.dayNumber} — the other days stay the same.</p>
      <div>
        <p className="text-[11px] font-semibold text-slate-600 mb-1.5">Pace for this day</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Pace for this day">
          {[{ value: '', label: 'Same as trip' }, ...TRAVEL_STYLES].map((option) => (
            <button
              key={option.value || 'same'}
              type="button"
              role="radio"
              aria-checked={pace === option.value}
              onClick={() => setPace(option.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                pace === option.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor={`day-note-${day.dayNumber}`} className="text-[11px] font-semibold text-slate-600 block mb-1.5">
          Anything to change? (optional)
        </label>
        <input
          id={`day-note-${day.dayNumber}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={LIMITS.MAX_DAY_NOTE_LENGTH}
          disabled={!aiOn}
          placeholder={aiOn ? 'e.g. more relaxed, add a café, no temples today' : 'Needs AI (Gemini key)'}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
        />
        {!aiOn && <p className="text-[10px] text-slate-500 mt-1">Without AI, the offline planner picks places that are not used on your other days.</p>}
      </div>
      <div className="flex gap-2">
        <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
          <RefreshCw className="w-3.5 h-3.5" /> Make a new Day {day.dayNumber}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700">
          Cancel
        </button>
      </div>
    </form>
  );
};

export const DayTimeline = ({ day, weather = null, onRegenerate, regenerating = false, regenerateBlocked = null, aiOn = false }) => {
  const [panelOpen, setPanelOpen] = useState(false);

  // Drive to the next stop, keyed by activity id (only when the route matches today's stops).
  const { legAfter, route } = useMemo(() => {
    const stops = mapStops(day);
    const r = day?.route && day.route.stopIds?.join() === stops.map((s) => s.id).join() && day.route.provider !== 'none' ? day.route : null;
    const legs = new Map();
    if (r) r.stopIds.forEach((id, i) => r.legs[i] && legs.set(id, r.legs[i]));
    return { legAfter: legs, route: r };
  }, [day]);

  if (!day || !day.activities) {
    return <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-100">No activities scheduled for this day.</div>;
  }
  const estimated = route?.provider === 'estimate';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-soft relative">
        {regenerating && (
          <div className="absolute inset-0 z-10 rounded-2xl bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2" role="status" data-testid="day-regenerating">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-700">Planning a new Day {day.dayNumber}...</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            {day.date && (
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                Day {day.dayNumber} • {formatDate(day.date)}
              </p>
            )}
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{day.title}</h2>
            <p className="text-sm text-slate-500 mt-1">{day.description}</p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2 flex-shrink-0">
            {day.estimatedDailyExpense > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                <IndianRupee className="w-3.5 h-3.5" />
                <span>Est. Daily Cost: {formatINR(day.estimatedDailyExpense)}</span>
              </div>
            )}
            {weather && Number.isFinite(weather.tMax) && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-900 text-xs font-semibold border border-sky-100"
                data-testid="day-weather"
                title={weather.kind === 'typical' ? 'Typical weather for this date (not a forecast)' : weather.kind === 'actual' ? 'Weather on that day' : 'Forecast'}
              >
                <WeatherIcon icon={weather.icon} className="w-4 h-4" />
                <span>
                  {weather.summary} • {Math.round(weather.tMax)}°/{Math.round(weather.tMin)}°
                  {weather.kind === 'forecast' && Number.isFinite(weather.rainChance) ? ` • ${weather.rainChance}% rain` : ''}
                  {weather.kind === 'typical' ? ' (usual)' : ''}
                </span>
              </div>
            )}
            {route && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold" data-testid="day-drive">
                <Car className="w-3.5 h-3.5" />
                <span>
                  Driving today: {estimated ? '≈ ' : ''}
                  {formatKm(route.distanceKm)} • {formatDuration(route.durationMin)}
                </span>
              </div>
            )}
            {onRegenerate && !panelOpen && (
              <button
                type="button"
                onClick={() => setPanelOpen(true)}
                disabled={Boolean(regenerateBlocked) || regenerating}
                title={regenerateBlocked ?? 'Re-plan only this day'}
                className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-60"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> New plan for this day
              </button>
            )}
          </div>
        </div>

        {panelOpen && (
          <RegeneratePanel
            key={day.dayNumber}
            day={day}
            aiOn={aiOn}
            onClose={() => setPanelOpen(false)}
            onSubmit={(options) => {
              setPanelOpen(false);
              onRegenerate(day.dayNumber, options);
            }}
          />
        )}

        <div className="relative mt-6 pl-4 sm:pl-6 border-l-2 border-blue-200 space-y-6 sm:space-y-8">
          {day.activities.map((activity, index) => {
            const leg = legAfter.get(String(activity.id));
            return (
              <div key={activity.id || index} className="relative group">
                <div className="absolute -left-[25px] sm:-left-[33px] top-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white border-4 border-blue-600 flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:border-indigo-600 transition-all">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                </div>

                <div className="bg-slate-50/70 hover:bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 hover:border-blue-200 hover:shadow-soft transition-all duration-200 flex flex-col md:flex-row gap-4 items-start">
                  {activity.imageUrl && (
                    <div className="w-full md:w-44 h-32 md:h-28 rounded-xl overflow-hidden flex-shrink-0 bg-slate-200">
                      <img
                        src={activity.imageUrl}
                        alt={activity.placeName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                        <Clock className="w-3 h-3" />
                        {activity.timeSlot || 'Flexible'}
                      </span>
                      {activity.cost > 0 && (
                        <span className="text-xs font-semibold text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded-md">{formatINR(activity.cost)} est.</span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{activity.placeName}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{activity.description}</p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500 font-medium">
                      {activity.estimatedDuration && (
                        <span className="flex items-center gap-1">
                          <Compass className="w-3.5 h-3.5 text-slate-400" />
                          {activity.estimatedDuration}
                        </span>
                      )}
                      {activity.category && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {activity.category}
                        </span>
                      )}
                    </div>

                    {activity.tips && (
                      <div className="flex items-start gap-1.5 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-800 font-medium mt-2">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>{activity.tips}</span>
                      </div>
                    )}
                  </div>
                </div>

                {leg && (
                  <p className="mt-2 ml-2 text-[11px] font-semibold text-slate-500 flex items-center gap-1.5" data-testid="timeline-leg">
                    <Navigation className="w-3.5 h-3.5 text-slate-400 rotate-180" />
                    {estimated ? '≈ ' : ''}
                    {formatKm(leg.distanceKm)} • {formatDuration(leg.durationMin)} to the next stop{estimated ? ' (estimate)' : ''}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DayTimeline;
