import { useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, Table2 } from 'lucide-react';
import { formatPaise } from '@tripplanner/shared';

/**
 * Part 15 — what was really spent next to the plan's estimate.
 * Form: one bar per part of the plan (spent) with a tick for the estimate — a target comparison, one hue.
 * Over the estimate the bar turns amber AND says "over by" with an icon (never colour alone).
 * Values are written next to every row (5 rows), details on hover / focus, and a table view.
 */

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** Overall budget as a meter: the fill carries the state, the track is a lighter step of the same hue. */
export const BudgetMeter = ({ spentPaise, budgetPaise }) => {
  if (!budgetPaise) return null;
  const share = spentPaise / budgetPaise;
  const state = share > 1 ? 'over' : share >= 0.9 ? 'close' : 'ok';
  const fill = { ok: 'bg-blue-600', close: 'bg-amber-500', over: 'bg-red-600' }[state];
  const track = { ok: 'bg-blue-100', close: 'bg-amber-100', over: 'bg-red-100' }[state];
  return (
    <div className="space-y-1.5" data-testid="budget-meter">
      <div className={`h-3 rounded-full overflow-hidden ${track}`} role="meter" aria-valuemin={0} aria-valuemax={budgetPaise / 100} aria-valuenow={spentPaise / 100} aria-label="Spent of the budget">
        <div className={`h-full rounded-r-[4px] ${fill}`} style={{ width: `${Math.min(100, share * 100)}%` }} />
      </div>
      <p className={`text-xs font-semibold flex items-center gap-1 ${state === 'over' ? 'text-red-700' : 'text-slate-600'}`}>
        {state === 'over' ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
        {state === 'over'
          ? `${formatPaise(spentPaise - budgetPaise)} over the budget`
          : `${formatPaise(budgetPaise - spentPaise)} left of ${formatPaise(budgetPaise)} (${pct(spentPaise, budgetPaise)}% used)`}
      </p>
    </div>
  );
};

export const SpendingVsPlan = ({ summary }) => {
  const [view, setView] = useState('chart');
  const [active, setActive] = useState(null);
  const rows = [
    ...summary.vsPlan,
    { key: 'outside', label: 'Outside the estimate', hint: 'Travel to / from, shopping, other', estimatePaise: null, actualPaise: summary.outsidePlanPaise },
  ];
  const max = Math.max(1, ...rows.map((r) => Math.max(r.estimatePaise ?? 0, r.actualPaise)));
  const at = (paise) => `${Math.min(100, (paise / max) * 100)}%`;

  return (
    <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-soft space-y-4" aria-labelledby="spending-vs-plan">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id="spending-vs-plan" className="text-base font-bold text-slate-900">
            Spent vs the plan
          </h3>
          <p className="text-[11px] text-slate-500">The plan&apos;s estimate for each part of the trip, and what you really spent.</p>
        </div>
        <div className="flex rounded-lg border border-slate-200 p-0.5" role="group" aria-label="Show as">
          {[
            { id: 'chart', label: 'Chart', icon: BarChart3 },
            { id: 'table', label: 'Table', icon: Table2 },
          ].map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={view === v.id}
              onClick={() => setView(v.id)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold ${view === v.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <v.icon className="w-3.5 h-3.5" /> {v.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'chart' ? (
        <>
          <div className="flex flex-wrap gap-4 text-[11px] text-slate-600" aria-hidden="true">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[3px] bg-blue-600" /> Spent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-[3px] h-3.5 bg-slate-800 rounded-full" /> Plan estimate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[3px] bg-amber-500" /> More than planned
            </span>
          </div>
          <ul className="space-y-3" data-testid="spending-chart">
            {rows.map((r) => {
              const over = r.estimatePaise !== null && r.actualPaise > r.estimatePaise;
              const detail =
                r.estimatePaise === null
                  ? `${r.label}: spent ${formatPaise(r.actualPaise)} (not in the plan's estimate — ${r.hint.toLowerCase()})`
                  : `${r.label}: spent ${formatPaise(r.actualPaise)} of the ${formatPaise(r.estimatePaise)} estimate (${pct(r.actualPaise, r.estimatePaise)}%)${over ? `, ${formatPaise(r.actualPaise - r.estimatePaise)} over` : ''}`;
              return (
                <li
                  key={r.key}
                  tabIndex={0}
                  aria-label={detail}
                  onMouseEnter={() => setActive(r.key)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(r.key)}
                  onBlur={() => setActive(null)}
                  className="relative grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_7.5rem] gap-x-3 gap-y-1 items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 p-1 -m-1"
                  data-testid={`spend-row-${r.key}`}
                >
                  <span className="text-xs font-semibold text-slate-700 leading-tight">
                    {r.label}
                    {r.hint && <span className="block text-[10px] font-normal text-slate-500">{r.hint}</span>}
                  </span>
                  <span className="relative h-6 block" aria-hidden="true">
                    <span className="absolute left-0 top-0 bottom-0 w-px bg-slate-300" />
                    {r.actualPaise > 0 && (
                      <span
                        className={`absolute left-0 top-1/2 -translate-y-1/2 h-3.5 rounded-r-[4px] ${over ? 'bg-amber-500' : 'bg-blue-600'}`}
                        style={{ width: at(r.actualPaise), minWidth: 3 }}
                      />
                    )}
                    {r.estimatePaise > 0 && (
                      <span className="absolute top-0.5 bottom-0.5 w-[3px] -ml-px rounded-full bg-slate-800 ring-2 ring-white" style={{ left: at(r.estimatePaise) }} />
                    )}
                  </span>
                  <span className="col-span-2 sm:col-span-1 text-right sm:text-left text-[11px] text-slate-600 tabular-nums">
                    <span className="font-bold text-slate-900">{formatPaise(r.actualPaise)}</span>
                    {r.estimatePaise !== null && <span> of {formatPaise(r.estimatePaise)}</span>}
                    {over && (
                      <span className="flex sm:flex items-center justify-end sm:justify-start gap-1 font-semibold text-amber-800">
                        <AlertTriangle className="w-3 h-3" /> {formatPaise(r.actualPaise - r.estimatePaise)} over
                      </span>
                    )}
                  </span>
                  {active === r.key && (
                    <span role="tooltip" className="absolute z-10 left-24 sm:left-40 -top-8 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-medium shadow-lg whitespace-nowrap pointer-events-none">
                      {detail}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <table className="w-full text-xs" data-testid="spending-table">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <th className="py-2 font-semibold">Part of the trip</th>
              <th className="py-2 font-semibold text-right">Plan estimate</th>
              <th className="py-2 font-semibold text-right">Spent</th>
              <th className="py-2 font-semibold text-right">Difference</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-slate-100 last:border-0">
                <td className="py-2 text-slate-700">{r.label}</td>
                <td className="py-2 text-right text-slate-600">{r.estimatePaise === null ? '—' : formatPaise(r.estimatePaise)}</td>
                <td className="py-2 text-right font-semibold text-slate-900">{formatPaise(r.actualPaise)}</td>
                <td className="py-2 text-right text-slate-600">
                  {r.estimatePaise === null ? '—' : r.actualPaise > r.estimatePaise ? `${formatPaise(r.actualPaise - r.estimatePaise)} over` : `${formatPaise(r.estimatePaise - r.actualPaise)} under`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};

export default SpendingVsPlan;
