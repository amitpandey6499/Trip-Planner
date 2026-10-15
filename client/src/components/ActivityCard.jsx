import { Clock, MapPin, Compass, Lightbulb, Navigation, AlertTriangle } from 'lucide-react';
import { formatDuration, formatINR, formatKm } from '@tripplanner/shared';

/**
 * One activity of a day (timeline). Part 12: in edit mode the editor adds a drag handle (`handle`),
 * Edit / Remove buttons (`actions`) and a time warning (`overlap`).
 */
export const ActivityCard = ({ activity, leg = null, estimated = false, handle = null, actions = null, overlap = null, dimmed = false }) => (
  <div className={`relative group ${dimmed ? 'opacity-40' : ''}`}>
    <div className="absolute -left-[25px] sm:-left-[33px] top-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white border-4 border-blue-600 flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:border-indigo-600 transition-all">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
    </div>

    <div
      className="bg-slate-50/70 hover:bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 hover:border-blue-200 hover:shadow-soft transition-all duration-200 flex flex-col md:flex-row gap-4 items-start"
      data-testid="activity-card"
    >
      {handle}
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

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100" data-testid="activity-time">
            <Clock className="w-3 h-3" />
            {activity.timeSlot || 'Flexible'}
          </span>
          <div className="flex items-center gap-2">
            {activity.cost > 0 && <span className="text-xs font-semibold text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded-md">{formatINR(activity.cost)} est.</span>}
            {actions}
          </div>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{activity.placeName}</h3>
        {activity.description && <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{activity.description}</p>}

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

        {overlap && (
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800" data-testid="time-overlap">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Starts before {overlap.placeName} ends ({overlap.until}).
          </p>
        )}

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

export default ActivityCard;
