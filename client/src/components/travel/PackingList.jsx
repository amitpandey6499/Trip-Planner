import { useMemo } from 'react';
import { CheckSquare, Printer } from 'lucide-react';
import { buildPackingList } from '@tripplanner/shared';

/**
 * Part 11 — packing list built from this trip (length, weather, plan, destination, food, group).
 * Ticks are saved with a saved trip; for an unsaved plan they are kept until the page is closed.
 */
export const PackingList = ({ itinerary, preferences, weatherDays, destination, checked = [], onToggle, saved }) => {
  const list = useMemo(
    () => buildPackingList({ itinerary, preferences, weather: weatherDays, destination }),
    [itinerary, preferences, weatherDays, destination],
  );
  const done = new Set(checked);
  const total = list.groups.reduce((n, g) => n + g.items.length, 0);
  const packed = list.groups.reduce((n, g) => n + g.items.filter((i) => done.has(i.id)).length, 0);

  return (
    <div className="space-y-4" data-testid="packing-list">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-blue-600" /> {packed} of {total} packed
          </p>
          <p className="text-[11px] text-slate-500">Based on: {list.basedOn.join(' • ')}</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
        >
          <Printer className="w-3.5 h-3.5" /> Print list
        </button>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${total ? (packed / total) * 100 : 0}%` }} />
      </div>
      {!saved && <p className="text-[11px] text-amber-700">Save the trip to keep your ticks.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.groups.map((group) => (
          <fieldset key={group.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-slate-500">{group.title}</legend>
            <ul className="space-y-1.5">
              {group.items.map((item) => (
                <li key={item.id}>
                  <label className="flex items-start gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="mt-1" checked={done.has(item.id)} onChange={() => onToggle(item.id)} />
                    <span className={done.has(item.id) ? 'line-through text-slate-400' : 'text-slate-800'}>
                      {item.label}
                      {item.reason && <span className="block text-[11px] text-slate-500 no-underline">{item.reason}</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ))}
      </div>
    </div>
  );
};

export default PackingList;
