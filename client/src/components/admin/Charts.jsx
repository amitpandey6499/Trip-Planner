import { useState } from 'react';
import { BarChart3, Table2 } from 'lucide-react';

/**
 * Part 17 — small, dependency-free charts for the admin dashboard.
 * One series each, so one hue and no legend box (the title says what is plotted). Marks are thin with a
 * 4px rounded data-end on a single baseline, gridlines are hairlines, and every chart has a table view and
 * a summary for screen readers. Details on hover.
 */

// Even, round tops, so the middle tick is a whole number too (0 / 10 / 20, never 12.5).
const NICE = [2, 4, 6, 8, 10, 20, 30, 40, 50, 60, 80, 100, 150, 200, 300, 400, 500, 600, 800, 1000, 2000, 4000, 6000, 10000];
const niceMax = (value) => NICE.find((n) => n >= value) ?? Math.ceil(value / 10000) * 10000;
const shortDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const longDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

const ViewToggle = ({ view, onChange }) => (
  <div className="flex rounded-lg border border-slate-200 p-0.5" role="group" aria-label="Show as">
    {[
      { id: 'chart', label: 'Chart', icon: BarChart3 },
      { id: 'table', label: 'Table', icon: Table2 },
    ].map((v) => (
      <button
        key={v.id}
        type="button"
        aria-pressed={view === v.id}
        onClick={() => onChange(v.id)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${view === v.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
      >
        <v.icon className="w-3.5 h-3.5" /> {v.label}
      </button>
    ))}
  </div>
);

export const ChartCard = ({ title, subtitle, children, action = null, testId }) => (
  <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-soft space-y-4" data-testid={testId}>
    <div className="flex items-start justify-between gap-2">
      <div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

/** Counts per day as columns. data: [{ date: 'YYYY-MM-DD', count }] */
export const DailyColumns = ({ title, subtitle, data, unit, testId }) => {
  const [view, setView] = useState('chart');
  const [active, setActive] = useState(null);
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const peak = data.reduce((best, d) => (d.count > (best?.count ?? -1) ? d : best), null);
  const top = niceMax(Math.max(1, peak?.count ?? 0));
  const ticks = [top, top / 2, 0];
  const labelAt = new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]);
  const summary = `${title}, ${data.length} days: ${total} ${unit} in total${peak?.count ? `, most on ${longDate(peak.date)} (${peak.count})` : ''}.`;

  return (
    <ChartCard title={title} subtitle={subtitle ?? `${total} ${unit} in ${data.length} days`} action={<ViewToggle view={view} onChange={setView} />} testId={testId}>
      {view === 'chart' ? (
        <div className="relative pl-8" role="img" aria-label={summary}>
          {/* y-axis: clean whole numbers, hairline grid */}
          <div className="absolute left-0 top-0 h-40 w-full pointer-events-none" aria-hidden="true">
            {ticks.map((t) => (
              <div key={t} className="absolute left-0 right-0 flex items-center gap-2" style={{ top: `${(1 - t / top) * 100}%`, transform: 'translateY(-50%)' }}>
                <span className="w-6 text-right text-[10px] text-slate-500 tabular-nums">{t.toLocaleString('en-IN')}</span>
                <span className={`flex-1 h-px ${t === 0 ? 'bg-slate-300' : 'bg-slate-100'}`} />
              </div>
            ))}
          </div>
          <div className="relative h-40 flex items-end gap-[2px]" onMouseLeave={() => setActive(null)} aria-hidden="true">
            {data.map((d, i) => (
              <div key={d.date} className="relative flex-1 h-full flex items-end justify-center" onMouseEnter={() => setActive(i)}>
                <div
                  className={`w-full max-w-[24px] rounded-t-[4px] ${active === i ? 'bg-blue-700' : 'bg-blue-600'}`}
                  style={{ height: d.count ? `${Math.max(2, (d.count / top) * 100)}%` : 0 }}
                />
                {active === i && (
                  <span
                    data-testid="chart-tooltip"
                    className={`absolute bottom-full mb-1 z-10 px-2 py-1 rounded-md bg-slate-900 text-white text-[11px] font-medium whitespace-nowrap pointer-events-none ${
                      i < data.length / 3 ? 'left-0' : i > (data.length * 2) / 3 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                    }`}
                  >
                    {longDate(d.date)}: {d.count} {unit}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="relative h-4 mt-1" aria-hidden="true">
            {data.map((d, i) =>
              labelAt.has(i) ? (
                <span
                  key={d.date}
                  className="absolute text-[10px] text-slate-500 whitespace-nowrap"
                  style={{ left: `${((i + 0.5) / data.length) * 100}%`, transform: i === 0 ? 'none' : i === data.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)' }}
                >
                  {shortDate(d.date)}
                </span>
              ) : null,
            )}
          </div>
        </div>
      ) : (
        <div className="max-h-56 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="py-1.5 font-semibold">Day</th>
                <th className="py-1.5 font-semibold text-right capitalize">{unit}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[...data].reverse().map((d) => (
                <tr key={d.date} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 text-slate-700">{longDate(d.date)}</td>
                  <td className="py-1.5 text-right font-semibold text-slate-900">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
};

/** Ranked horizontal bars (e.g. popular destinations). rows: [{ label, value }] — value shown at the bar tip. */
export const RankedBars = ({ rows, unit, empty = 'Nothing yet.' }) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length || rows.every((r) => r.value === 0)) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-3 items-center" title={`${r.label}: ${r.value} ${unit}`}>
          <span className="text-xs font-semibold text-slate-700 truncate">{r.label}</span>
          <span className="flex items-center gap-2 min-w-0">
            <span className="h-3.5 rounded-r-[4px] bg-blue-600 flex-shrink-0" style={{ width: `${(r.value / max) * 80}%`, minWidth: r.value ? 3 : 0 }} aria-hidden="true" />
            <span className="text-xs font-bold text-slate-900 tabular-nums">{r.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
};

/** Stat tile: label, value, optional context line. */
export const StatTile = ({ label, value, sub, icon: Icon, testId }) => (
  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-soft" data-testid={testId}>
    <p className="text-xs text-slate-500 flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5" />} {label}
    </p>
    <p className="text-2xl font-extrabold text-slate-900 mt-1">{value}</p>
    {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
  </div>
);
