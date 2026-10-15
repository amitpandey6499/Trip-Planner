import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock, IndianRupee, MapPin, Sparkles } from 'lucide-react';
import { formatINR, formatMonthRanges } from '@tripplanner/shared';
import { useTrip } from '../context/TripContext';
import DestinationImage from './DestinationImage';
import FavoriteButton from './FavoriteButton';

/** One destination on Explore / Home (Part 10: real data, no made-up ratings). */
export const DestinationCard = ({ destination, aiOn = true }) => {
  const navigate = useNavigate();
  const { setCurrentPreferences } = useTrip();
  const d = destination;
  const needsAi = !aiOn && !d.offlinePlanner;

  const planTrip = () => {
    setCurrentPreferences((prev) => ({ ...prev, destination: d.name, interests: d.interests?.length ? d.interests : prev.interests }));
    navigate('/trips/new');
  };

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 flex flex-col" data-testid="destination-card">
      <Link to={`/destinations/${d.slug}`} className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <DestinationImage src={d.image} alt={d.name} credit={d.imageCredit} className="w-full h-full group-hover:scale-105 transition-transform duration-500" />
        <FavoriteButton slug={d.slug} name={d.name} className="absolute top-3 right-3" />
        {d.inSeason && (
          <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[10px] font-bold uppercase tracking-wide">Good time to go</span>
        )}
      </Link>

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <Link to={`/destinations/${d.slug}`} className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
            {d.name}
          </Link>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-slate-400" />
            {d.state}
          </p>
          <p className="text-xs text-slate-600 mt-2 line-clamp-2">{d.summary}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[11px] text-slate-600 font-medium">
            <span className="flex items-center gap-1" title="Best months to visit">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400" /> {formatMonthRanges(d.bestMonths)}
            </span>
            {d.idealDays?.length === 2 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> {d.idealDays[0]}–{d.idealDays[1]} days
              </span>
            )}
            {d.dailyBudget?.Moderate > 0 && (
              <span className="flex items-center gap-1" title="Typical mid-range cost per person per day (estimate)">
                <IndianRupee className="w-3.5 h-3.5 text-slate-400" /> ≈ {formatINR(d.dailyBudget.Moderate)}/day
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(d.categories ?? []).slice(0, 3).map((category) => (
              <span key={category} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {category}
              </span>
            ))}
            {needsAi && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1" title="Planning this destination needs a Gemini key">
                <Sparkles className="w-3 h-3" /> Needs AI
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <Link to={`/destinations/${d.slug}`} className="text-xs font-semibold text-slate-600 hover:text-slate-900 py-1.5 px-2 rounded-lg hover:bg-slate-100">
            Details
          </Link>
          <button
            onClick={planTrip}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 py-1.5 px-3 rounded-lg shadow-xs"
          >
            <span>Plan Trip</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DestinationCard;
