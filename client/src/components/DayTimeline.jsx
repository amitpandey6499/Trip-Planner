import { useMemo, useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { IndianRupee, RefreshCw, Loader2, Car, Plus } from 'lucide-react';
import { LIMITS, TRAVEL_STYLES, formatDate, formatDuration, formatINR, formatKm, mapStops, timeOverlaps } from '@tripplanner/shared';
import WeatherIcon from './travel/WeatherIcon';
import ActivityCard from './ActivityCard';
import SortableActivity from './editor/SortableActivity';

/**
 * One day of the itinerary. Part 8: the drive between stops comes from the day's road route.
 * Part 9: "New plan for this day" re-plans only this day (optional pace + wish for the AI).
 * Part 12: `editing` → drag to reorder (the DndContext is in ItineraryBoard), edit / remove / add, rename the day.
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

/** Day title as a text box while editing: saved on Enter or when the box loses focus, Escape puts it back. */
const DayTitleInput = ({ day, onRename }) => {
  const [value, setValue] = useState(day.title);
  const commit = () => {
    const title = value.trim();
    if (!title) return setValue(day.title);
    if (title !== day.title) onRename(title);
  };
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setValue(day.title);
          e.currentTarget.blur();
        }
      }}
      maxLength={120}
      aria-label={`Title of Day ${day.dayNumber}`}
      className="w-full text-xl sm:text-2xl font-bold text-slate-900 bg-transparent border-b-2 border-dashed border-slate-300 focus:border-blue-500 focus:outline-none py-0.5"
    />
  );
};

export const DayTimeline = ({
  day,
  weather = null,
  onRegenerate,
  regenerating = false,
  regenerateBlocked = null,
  aiOn = false,
  // Part 12 (edit mode)
  editing = false,
  routeUpdating = false,
  onEditActivity,
  onAddActivity,
  onRemoveActivity,
  onRenameDay,
}) => {
  const [panelOpen, setPanelOpen] = useState(false);

  // Drive to the next stop, keyed by activity id (only when the route matches today's stops).
  const { legAfter, route, routeOutdated } = useMemo(() => {
    const stops = mapStops(day);
    const matches = day?.route && day.route.stopIds?.join() === stops.map((s) => s.id).join();
    const r = matches && day.route.provider !== 'none' ? day.route : null;
    const legs = new Map();
    if (r) r.stopIds.forEach((id, i) => r.legs[i] && legs.set(id, r.legs[i]));
    return { legAfter: legs, route: r, routeOutdated: !matches && stops.length >= 2 };
  }, [day]);
  const overlaps = useMemo(() => (editing ? timeOverlaps(day?.activities ?? []) : new Map()), [editing, day]);

  if (!day || !day.activities) {
    return <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-100">No activities scheduled for this day.</div>;
  }
  const estimated = route?.provider === 'estimate';
  const full = day.activities.length >= LIMITS.MAX_ACTIVITIES_PER_DAY;
  const canRemove = day.activities.length > 1;

  return (
    <div className="space-y-6">
      <div className={`bg-white rounded-2xl p-5 sm:p-6 border shadow-soft relative ${editing ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-100'}`}>
        {regenerating && (
          <div className="absolute inset-0 z-10 rounded-2xl bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2" role="status" data-testid="day-regenerating">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-700">Planning a new Day {day.dayNumber}...</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex-1 min-w-0">
            {day.date && (
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                Day {day.dayNumber} • {formatDate(day.date)}
              </p>
            )}
            {editing ? <DayTitleInput key={`${day.dayNumber}:${day.title}`} day={day} onRename={onRenameDay} /> : <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{day.title}</h2>}
            <p className="text-sm text-slate-500 mt-1">{day.description}</p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2 flex-shrink-0">
            {day.estimatedDailyExpense > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100" data-testid="day-cost">
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
            {!route && routeOutdated && routeUpdating && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold" role="status" data-testid="route-updating">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating the road route...
              </div>
            )}
            {onRegenerate && !panelOpen && !editing && (
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

        {panelOpen && !editing && (
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

        <div className="relative mt-6 pl-4 sm:pl-6 border-l-2 border-blue-200 space-y-6 sm:space-y-8" data-testid="day-activities">
          {editing ? (
            <SortableContext items={day.activities.map((a) => String(a.id))} strategy={verticalListSortingStrategy}>
              {day.activities.map((activity) => (
                <SortableActivity
                  key={activity.id}
                  activity={activity}
                  leg={legAfter.get(String(activity.id))}
                  estimated={estimated}
                  overlap={overlaps.get(String(activity.id))}
                  canRemove={canRemove}
                  onEdit={onEditActivity}
                  onRemove={onRemoveActivity}
                />
              ))}
            </SortableContext>
          ) : (
            day.activities.map((activity, index) => (
              <ActivityCard key={activity.id || index} activity={activity} leg={legAfter.get(String(activity.id))} estimated={estimated} />
            ))
          )}
        </div>

        {editing && (
          <button
            type="button"
            onClick={() => onAddActivity(day.dayNumber)}
            disabled={full}
            title={full ? `A day can have at most ${LIMITS.MAX_ACTIVITIES_PER_DAY} activities.` : undefined}
            className="no-print mt-6 w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 text-sm font-semibold text-slate-600 hover:text-blue-700 inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:border-slate-300"
          >
            <Plus className="w-4 h-4" /> {full ? `Day ${day.dayNumber} is full` : `Add an activity to Day ${day.dayNumber}`}
          </button>
        )}
      </div>
    </div>
  );
};

export default DayTimeline;
