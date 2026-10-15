import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bed, CalendarDays, Clock, ExternalLink, Info, MapPin, Plane, Sparkles, TrainFront, Utensils } from 'lucide-react';
import { addDays, formatINR, formatMonthRanges, monthName, todayIso } from '@tripplanner/shared';
import { destinationApi } from '../services/api';
import { useTrip } from '../context/TripContext';
import { useSystemStatus } from '../hooks/useSystemStatus';
import { useWeather } from '../hooks/useWeather';
import DestinationImage from '../components/DestinationImage';
import FavoriteButton from '../components/FavoriteButton';
import { PageLoader } from '../components/PageState';
import WeatherPanel from '../components/travel/WeatherPanel';
import ReachPanel from '../components/travel/ReachPanel';
import NotFound from './NotFound';

const Section = ({ title, icon: Icon, children, action }) => (
  <section className="bg-white rounded-2xl border border-slate-100 shadow-soft p-5 sm:p-6 space-y-3">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        <Icon className="w-5 h-5 text-blue-600" /> {title}
      </h2>
      {action}
    </div>
    {children}
  </section>
);

/** Part 10 + 11 — one destination: photo, when to go, costs, next 7 days of weather, how to reach, stays, food. */
export const DestinationPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { setCurrentPreferences } = useTrip();
  const { status } = useSystemStatus();
  const [state, setState] = useState({ data: null, loading: true, missing: false });
  const today = todayIso();
  const weather = useWeather({ destination: state.data?.name, start: today, end: addDays(today, 6), enabled: Boolean(state.data) });

  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true, missing: false });
    destinationApi
      .get(slug)
      .then((res) => active && setState({ data: res.data, loading: false, missing: false }))
      .catch((err) => active && setState({ data: null, loading: false, missing: err.response?.status === 404, error: err.message }));
    return () => {
      active = false;
    };
  }, [slug]);

  if (state.loading) return <PageLoader title="Loading destination..." />;
  if (state.missing) return <NotFound />;
  const d = state.data;
  if (!d) return <p className="p-8 text-center text-sm text-red-600">{state.error}</p>;

  const aiOn = Boolean(status?.services?.geminiAI);
  const planTrip = () => {
    setCurrentPreferences((prev) => ({ ...prev, destination: d.name, interests: d.interests?.length ? d.interests : prev.interests }));
    navigate('/trips/new');
  };
  const month = new Date().getMonth() + 1;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="relative h-72 sm:h-96 w-full bg-slate-200">
        <DestinationImage src={d.image} alt={d.name} credit={d.imageCredit} className="w-full h-full" showCredit />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="text-white">
            <Link to="/explore" className="inline-flex items-center gap-1 text-xs font-semibold text-white/80 hover:text-white mb-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Explore
            </Link>
            <h1 className="text-3xl sm:text-4xl font-extrabold">{d.name}</h1>
            <p className="text-sm text-white/85 flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {d.state}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FavoriteButton slug={d.slug} name={d.name} />
            <button onClick={planTrip} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-lg">
              Plan a trip here <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pt-6 space-y-6">
        {!aiOn && !d.offlinePlanner && status && (
          <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> Planning {d.name} needs AI (a Gemini key on the server). Everything on this page works without it.
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Section title="About" icon={Info}>
            <p className="text-sm text-slate-700 leading-relaxed">{d.summary}</p>
            <ul className="text-sm text-slate-700 list-disc pl-5 space-y-0.5">
              {d.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
            {d.wikiUrl && (
              <a href={d.wikiUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1">
                Read more on Wikipedia <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </Section>

          <Section title="When to go" icon={CalendarDays}>
            <p className="text-sm font-semibold text-slate-800">{formatMonthRanges(d.bestMonths)}</p>
            <div className="grid grid-cols-6 gap-1" aria-label="Best months">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <span
                  key={m}
                  className={`text-[10px] font-bold text-center py-1 rounded ${d.bestMonths.includes(m) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'} ${m === month ? 'ring-2 ring-blue-400' : ''}`}
                >
                  {monthName(m)}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Ideal stay: {d.idealDays[0]}–{d.idealDays[1]} days
            </p>
          </Section>

          <Section title="Typical daily cost" icon={Bed}>
            <table className="w-full text-sm">
              <tbody>
                {['Budget', 'Moderate', 'Luxury'].map((tier) => (
                  <tr key={tier} className="border-b border-slate-100 last:border-0">
                    <td className="py-1.5 text-slate-600">{tier}</td>
                    <td className="py-1.5 text-right font-bold text-slate-900">{formatINR(d.dailyBudget[tier])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[11px] text-slate-500">Per person per day with a shared room, food and local travel. Estimates — travel to {d.name} not included.</p>
          </Section>
        </div>

        <Section title="Weather — next 7 days" icon={CalendarDays}>
          <WeatherPanel weather={weather} compact />
        </Section>

        <Section title="How to get there" icon={Plane}>
          <div className="flex flex-wrap gap-4 text-xs text-slate-600">
            {d.reach.airport && (
              <span className="flex items-center gap-1">
                <Plane className="w-3.5 h-3.5" /> {d.reach.airport.name} ({d.reach.airport.code}), {d.reach.airport.km} km
              </span>
            )}
            {d.reach.railway && (
              <span className="flex items-center gap-1">
                <TrainFront className="w-3.5 h-3.5" /> {d.reach.railway.name} ({d.reach.railway.code}), {d.reach.railway.km} km
              </span>
            )}
          </div>
          <ReachPanel destination={d.slug} />
        </Section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section
            title="Where to stay"
            icon={Bed}
            action={
              <Link to={`/hotels?destination=${d.slug}`} className="text-xs font-semibold text-blue-700 hover:underline">
                All stays →
              </Link>
            }
          >
            <ul className="space-y-2">
              {d.stays.map((stay) => (
                <li key={stay.area} className="text-sm">
                  <p className="font-semibold text-slate-800">{stay.area}</p>
                  <p className="text-xs text-slate-500">
                    Typical room per night: {formatINR(stay.prices.Budget)} (budget) • {formatINR(stay.prices.Moderate)} (mid-range) • {formatINR(stay.prices.Luxury)} (luxury)
                  </p>
                </li>
              ))}
            </ul>
          </Section>
          <Section
            title="Where to eat"
            icon={Utensils}
            action={
              <Link to={`/restaurants?destination=${d.slug}`} className="text-xs font-semibold text-blue-700 hover:underline">
                All places →
              </Link>
            }
          >
            {d.eateries.length ? (
              <ul className="space-y-1.5">
                {d.eateries.slice(0, 5).map((e) => (
                  <li key={e.name} className="text-sm flex items-center justify-between gap-2">
                    <span>
                      <span className="font-semibold text-slate-800">{e.name}</span> <span className="text-xs text-slate-500">• {e.cuisine}</span>
                    </span>
                    {e.veg && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">VEG</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">{d.notes.find((n) => /meal|food/i.test(n)) ?? 'No list yet.'}</p>
            )}
          </Section>
        </div>

        {d.notes.length > 0 && (
          <Section title="Good to know" icon={Info}>
            <ul className="text-sm text-slate-700 list-disc pl-5 space-y-0.5">
              {d.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
};

export default DestinationPage;
