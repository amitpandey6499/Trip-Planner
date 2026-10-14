import { IndianRupee, Bed, Compass, Utensils, Car, ShieldAlert } from 'lucide-react';

export const CostBreakdown = ({ breakdown, totalBudget = 15000, durationDays = 4 }) => {
  if (!breakdown) {
    breakdown = {
      accommodation: Math.round(totalBudget * 0.45),
      activitiesAndSightseeing: Math.round(totalBudget * 0.25),
      foodAndDining: Math.round(totalBudget * 0.20),
      localTransport: Math.round(totalBudget * 0.10),
      totalEstimated: totalBudget,
      currency: 'INR'
    };
  }

  const total = breakdown.totalEstimated || totalBudget;

  const categories = [
    {
      name: 'Accommodation & Stays',
      amount: breakdown.accommodation,
      pct: Math.round((breakdown.accommodation / total) * 100),
      icon: Bed,
      color: 'bg-blue-600',
      lightColor: 'bg-blue-50 text-blue-700'
    },
    {
      name: 'Activities & Attractions',
      amount: breakdown.activitiesAndSightseeing,
      pct: Math.round((breakdown.activitiesAndSightseeing / total) * 100),
      icon: Compass,
      color: 'bg-indigo-600',
      lightColor: 'bg-indigo-50 text-indigo-700'
    },
    {
      name: 'Food & Dining',
      amount: breakdown.foodAndDining,
      pct: Math.round((breakdown.foodAndDining / total) * 100),
      icon: Utensils,
      color: 'bg-amber-600',
      lightColor: 'bg-amber-50 text-amber-700'
    },
    {
      name: 'Local Transport & Cabs',
      amount: breakdown.localTransport,
      pct: Math.round((breakdown.localTransport / total) * 100),
      icon: Car,
      color: 'bg-emerald-600',
      lightColor: 'bg-emerald-50 text-emerald-700'
    }
  ];

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-soft space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            Financial Estimates
          </span>
          <h3 className="text-xl font-bold text-slate-900 mt-1">Estimated Budget Breakdown</h3>
          <p className="text-xs text-slate-500">Based on {durationDays} days and user preferences.</p>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Estimated</span>
          <span className="text-2xl font-black text-slate-900 flex items-center gap-0.5">
            <IndianRupee className="w-5 h-5 text-blue-600" />
            {total.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Stacked Progress Bar */}
      <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden flex">
        {categories.map((c, idx) => (
          <div
            key={idx}
            className={`${c.color} h-full transition-all`}
            style={{ width: `${c.pct}%` }}
            title={`${c.name}: ${c.pct}%`}
          />
        ))}
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((cat, idx) => {
          const Icon = cat.icon;
          return (
            <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat.lightColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-500">{cat.pct}%</span>
              </div>
              <h4 className="text-xs font-bold text-slate-700">{cat.name}</h4>
              <p className="text-base font-extrabold text-slate-900">
                ₹{cat.amount.toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
        <ShieldAlert className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p>
          Prices are algorithmic estimates calculated from regional seasonal averages. They do not constitute guaranteed booking prices or pre-paid reservations.
        </p>
      </div>
    </div>
  );
};

export default CostBreakdown;
