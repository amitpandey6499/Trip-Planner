import React from 'react';
import { Clock, MapPin, IndianRupee, Lightbulb, Compass, Navigation } from 'lucide-react';

export const DayTimeline = ({ day }) => {
  if (!day || !day.activities) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-100">
        No activities scheduled for this day.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Day Overview Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {day.title}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{day.description}</p>
          </div>
          {day.estimatedDailyExpense && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold self-start sm:self-auto border border-blue-100">
              <IndianRupee className="w-3.5 h-3.5" />
              <span>Est. Daily Cost: ₹{day.estimatedDailyExpense.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Timeline Activities */}
        <div className="relative mt-6 pl-4 sm:pl-6 border-l-2 border-blue-200 space-y-6 sm:space-y-8">
          {day.activities.map((activity, index) => (
            <div key={activity.id || index} className="relative group">
              
              {/* Timeline Pin Indicator */}
              <div className="absolute -left-[25px] sm:-left-[33px] top-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white border-4 border-blue-600 flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:border-indigo-600 transition-all">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
              </div>

              {/* Activity Card */}
              <div className="bg-slate-50/70 hover:bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 hover:border-blue-200 hover:shadow-soft transition-all duration-200 flex flex-col md:flex-row gap-4 items-start">
                
                {/* Thumbnail Image */}
                {activity.imageUrl && (
                  <div className="w-full md:w-44 h-32 md:h-28 rounded-xl overflow-hidden flex-shrink-0 bg-slate-200">
                    <img
                      src={activity.imageUrl}
                      alt={activity.placeName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                  </div>
                )}

                {/* Details */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                      <Clock className="w-3 h-3" />
                      {activity.timeSlot || 'Flexible'}
                    </span>

                    {activity.cost > 0 && (
                      <span className="text-xs font-semibold text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded-md">
                        ₹{activity.cost} est.
                      </span>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {activity.placeName}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {activity.description}
                  </p>

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

                  {/* Practical Tips */}
                  {activity.tips && (
                    <div className="flex items-start gap-1.5 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-800 font-medium mt-2">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span>{activity.tips}</span>
                    </div>
                  )}
                </div>

              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DayTimeline;
