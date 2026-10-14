import { IndianRupee, Bed, Compass, Utensils, Car, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { budgetShares, formatINR, nightsFor, roomsNeeded } from '@tripplanner/shared';

const CATEGORIES = [
  { key: 'accommodation', name: 'Accommodation & Stays', icon: Bed, color: 'bg-blue-600', lightColor: 'bg-blue-50 text-blue-700' },
  { key: 'activitiesAndSightseeing', name: 'Activities & Attractions', icon: Compass, color: 'bg-indigo-600', lightColor: 'bg-indigo-50 text-indigo-700' },
  { key: 'foodAndDining', name: 'Food & Dining', icon: Utensils, color: 'bg-amber-600', lightColor: 'bg-amber-50 text-amber-700' },
  { key: 'localTransport', name: 'Local Transport & Cabs', icon: Car, color: 'bg-emerald-600', lightColor: 'bg-emerald-50 text-emerald-700' },
];

/**
 * Budget tab. All numbers come from the normalized itinerary (shared computeBudget),
 * so the parts always add up to the total.
 */
export const CostBreakdown = ({ itinerary }) => {
  const breakdown = itinerary.budgetBreakdown;
  const total = breakdown.totalEstimated;
  const shares = budgetShares(breakdown);
  const { totalBudget, withinBudget, durationDays, travelersCount } = itinerary;
  const perPerson = travelersCount ? Math.round(total / travelersCount) : total;
  const usedPct = totalBudget > 0 ? Math.min(100, Math.round((total / totalBudget) * 100)) : null;

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-soft space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Financial Estimates</span>
          <h3 className="text-xl font-bold text-slate-900 mt-1">Estimated Budget Breakdown</h3>
          <p className="text-xs text-slate-500">
            {durationDays} days • {nightsFor(durationDays)} nights • {travelersCount} travelers ({roomsNeeded(travelersCount)}{' '}
            {roomsNeeded(travelersCount) === 1 ? 'room' : 'rooms'}) • whole-group costs
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Estimated</span>
          <span className="text-2xl font-black text-slate-900 flex items-center gap-0.5 justify-end">
            <IndianRupee className="w-5 h-5 text-blue-600" />
            {total.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500">≈ {formatINR(perPerson)} per person</span>
        </div>
      </div>

      {/* Estimate vs the user's budget */}
      {usedPct !== null && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600">
              {formatINR(total)} of your {formatINR(totalBudget)} budget
            </span>
            {withinBudget ? (
              <span className="text-emerald-700 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {formatINR(totalBudget - total)} left
              </span>
            ) : (
              <span className="text-amber-700 inline-flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {formatINR(total - totalBudget)} over
              </span>
            )}
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full ${withinBudget ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${usedPct}%` }} />
          </div>
        </div>
      )}

      {/* Stacked bar of the four buckets */}
      <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden flex" aria-hidden="true">
        {CATEGORIES.map((c) => (
          <div key={c.key} className={`${c.color} h-full transition-all`} style={{ width: `${shares[c.key]}%` }} title={`${c.name}: ${shares[c.key]}%`} />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CATEGORIES.map(({ key, name, icon: Icon, lightColor }) => (
          <div key={key} className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${lightColor}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-500">{shares[key]}%</span>
            </div>
            <h4 className="text-xs font-bold text-slate-700">{name}</h4>
            <p className="text-base font-extrabold text-slate-900">{formatINR(breakdown[key])}</p>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
        <ShieldAlert className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p>
          Estimates are added up from each activity&apos;s cost plus the stay. They are not booking prices; real prices change with season and
          availability.
        </p>
      </div>
    </div>
  );
};

export default CostBreakdown;
