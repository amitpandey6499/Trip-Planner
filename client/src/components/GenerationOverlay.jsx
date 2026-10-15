import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Sparkles, X } from 'lucide-react';
import { formatDate } from '@tripplanner/shared';
import { useTrip } from '../context/TripContext';

/**
 * Part 9 — live progress while a trip is being planned (on every page: wizard, Home quick search,
 * Regenerate). Days appear one by one as the AI finishes writing them.
 */
const sightsOf = (day) =>
  (day.activities ?? [])
    .filter((a) => a.category !== 'Transit' && a.category !== 'Restaurant')
    .map((a) => a.placeName)
    .slice(0, 3);

export const GenerationOverlay = () => {
  const { generation, cancelGeneration } = useTrip();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!generation) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [generation]);

  if (!generation) return null;
  const { destination, total, days, message, percent, startedAt } = generation;
  const seconds = Math.max(0, Math.round((now - startedAt) / 1000));
  const slots = total ? Array.from({ length: total }, (_, index) => days.find((d) => d.index === index) ?? { index, day: null }) : days;

  return (
    <div className="fixed inset-0 z-[1100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in no-print">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="generation-title"
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto"
        data-testid="generation-overlay"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Planning your trip
            </p>
            <h2 id="generation-title" className="text-xl font-extrabold text-slate-900 mt-1">
              {destination || 'Your trip'}
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-400 tabular-nums">{seconds}s</span>
        </div>

        <div>
          <div
            className="h-2.5 rounded-full bg-slate-100 overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Planning progress"
          >
            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500" style={{ width: `${Math.max(4, percent)}%` }} />
          </div>
          <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5" aria-live="polite">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 flex-shrink-0" />
            {message}
          </p>
        </div>

        {slots.length > 0 && (
          <ol className="space-y-2" aria-label="Days">
            {slots.map(({ index, day }) => (
              <li
                key={index}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  day ? 'bg-emerald-50/60 border-emerald-200 animate-in fade-in slide-in-from-bottom-1' : 'bg-slate-50 border-slate-200/70'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${
                    day ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {day ? (
                    <>
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="truncate">{day.title}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {day.date ? `${formatDate(day.date)} • ` : ''}
                        {sightsOf(day).join(', ') || `${day.activities?.length ?? 0} activities`}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-400">Day {index + 1}</p>
                      <div className="h-2 mt-1.5 w-2/3 rounded bg-slate-200 animate-pulse" />
                    </>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-[11px] text-slate-400">You can cancel at any time.</p>
          <button
            type="button"
            onClick={cancelGeneration}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerationOverlay;
