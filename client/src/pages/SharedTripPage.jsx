import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Bed,
  CalendarPlus,
  Calendar,
  Check,
  Copy,
  CopyPlus,
  Eye,
  FileText,
  IndianRupee,
  Link2Off,
  Loader2,
  Map as MapIcon,
  PieChart,
  Sparkles,
  Users,
  Utensils,
} from 'lucide-react';
import { buildTripCalendar, formatDate, formatINR, mapsSearchUrl, normalizeItinerary } from '@tripplanner/shared';
import { useAuth } from '../context/AuthContext';
import { useTrip } from '../context/TripContext';
import { shareApi } from '../services/api';
import { PageLoader } from '../components/PageState';
import DestinationImage from '../components/DestinationImage';
import DayTimeline from '../components/DayTimeline';
import InteractiveMap from '../components/InteractiveMap';
import HotelCard from '../components/HotelCard';
import RestaurantCard from '../components/RestaurantCard';
import CostBreakdown from '../components/CostBreakdown';
import { exportFileName, saveBlob, saveText } from '../utils/download';
import { stayLinks } from '../utils/tripLinks';

const TABS = [
  { id: 'days', label: 'Itinerary', icon: Calendar },
  { id: 'map', label: 'Map', icon: MapIcon },
  { id: 'stays', label: 'Stays & food', icon: Bed },
  { id: 'costs', label: 'Costs', icon: PieChart },
];

const button = 'inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-60';

/**
 * Part 14 — /share/:slug: a trip someone shared. Read-only, no login needed.
 * Visitors can download the PDF / calendar or save a copy to their own trips (login).
 */
export const SharedTripPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useTrip();
  const [state, setState] = useState({ loading: true, data: null, error: null, missing: false });
  const [tab, setTab] = useState('days');
  const [dayNumber, setDayNumber] = useState(1);
  const [busy, setBusy] = useState(null); // 'copy' | 'pdf'
  const [actionError, setActionError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Reloaded after login too (then "this is your trip" can be shown to the owner).
  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: !s.data }));
    shareApi
      .get(slug)
      .then((res) => active && setState({ loading: false, data: res.data, error: null, missing: false }))
      .catch((err) => active && setState({ loading: false, data: null, error: err.message, missing: err.response?.status === 404 }));
    return () => {
      active = false;
    };
  }, [slug, user?.id]);

  const itinerary = useMemo(() => {
    if (!state.data?.itinerary) return null;
    try {
      return normalizeItinerary(state.data.itinerary, {});
    } catch {
      return null;
    }
  }, [state.data]);

  if (state.loading) return <PageLoader title="Opening the shared trip..." />;
  if (!itinerary) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-10 text-center max-w-md border border-slate-100 shadow-soft space-y-4" data-testid="share-missing">
          <Link2Off className="w-12 h-12 text-slate-400 mx-auto" />
          <h1 className="text-xl font-bold text-slate-800">{state.missing ? 'This shared trip is not available' : 'Could not open this trip'}</h1>
          <p className="text-sm text-slate-500">{state.missing ? 'The owner may have turned the link off or made a new one. Ask them for the new link.' : state.error}</p>
          <Link to="/trips/new" className={`${button} bg-blue-600 hover:bg-blue-700 text-white`}>
            <Sparkles className="w-4 h-4" /> Plan your own trip
          </Link>
        </div>
      </div>
    );
  }

  const trip = state.data;
  const day = itinerary.days.find((d) => d.dayNumber === dayNumber) ?? itinerary.days[0];
  const calendar = buildTripCalendar(itinerary, { uidBase: slug, url: window.location.href });

  const saveCopy = async () => {
    if (!user) {
      navigate('/auth', { state: { from: `/share/${slug}`, message: 'Sign in to save a copy of this trip to your trips.' } });
      return;
    }
    setBusy('copy');
    setActionError(null);
    try {
      const res = await shareApi.copy(slug);
      showToast('A copy was saved to your trips — change it as you like.');
      navigate(`/trips/${res.data.id}`);
    } catch (err) {
      setActionError(err.message);
      setBusy(null);
    }
  };

  const downloadPdf = async () => {
    setBusy('pdf');
    setActionError(null);
    try {
      saveBlob(await shareApi.pdf(slug), exportFileName(itinerary.title, 'pdf'));
    } catch (err) {
      setActionError(`The PDF could not be made: ${err.message}`);
    } finally {
      setBusy(null);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setActionError('This browser blocked copying. Copy the address from the address bar.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12" data-testid="shared-trip">
      <div className="relative h-56 sm:h-72 w-full bg-slate-200">
        <DestinationImage src={trip.destinationImage} alt={itinerary.destination} className="w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/30 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-5 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Shared by {trip.sharedBy}</p>
          <h1 className="text-2xl sm:text-4xl font-extrabold">{itinerary.title}</h1>
          <p className="text-xs sm:text-sm text-white/85 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {formatDate(itinerary.startDate)} – {formatDate(itinerary.endDate)} • {itinerary.days.length} days
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {itinerary.travelersCount} travellers
            </span>
            <span className="flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5" /> Est. {formatINR(itinerary.estimatedTotal)}
            </span>
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {trip.isOwner && (
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2" data-testid="owner-banner">
            <span className="flex items-center gap-1.5 font-semibold">
              <Eye className="w-4 h-4" /> This is how others see your trip. Opened {trip.views} {trip.views === 1 ? 'time' : 'times'} by others.
            </span>
            <Link to={`/trips/${trip.tripId}`} className="font-semibold text-blue-700 hover:underline">
              Open it in My Trips →
            </Link>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-soft flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <p className="text-sm text-slate-600 max-w-xl">{itinerary.summary || `A ${itinerary.days.length}-day plan for ${itinerary.destination}.`}</p>
          <div className="flex flex-wrap gap-2 no-print">
            {!trip.isOwner && (
              <button type="button" onClick={saveCopy} disabled={busy === 'copy'} className={`${button} bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20`}>
                {busy === 'copy' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CopyPlus className="w-4 h-4" />} Save a copy to my trips
              </button>
            )}
            <button type="button" onClick={downloadPdf} disabled={busy === 'pdf'} className={`${button} border border-slate-200 bg-white hover:bg-slate-50 text-slate-700`}>
              {busy === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-slate-500" />} PDF
            </button>
            <button
              type="button"
              onClick={() => saveText(calendar.ics, exportFileName(itinerary.title, 'ics'), 'text/calendar;charset=utf-8')}
              disabled={!calendar.eventCount}
              className={`${button} border border-slate-200 bg-white hover:bg-slate-50 text-slate-700`}
              title="Import into Google Calendar: Settings → Import & export"
            >
              <CalendarPlus className="w-4 h-4 text-slate-500" /> Calendar
            </button>
            <button type="button" onClick={copyLink} className={`${button} border border-slate-200 bg-white hover:bg-slate-50 text-slate-700`}>
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />} {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </div>
        {actionError && (
          <p className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700" role="alert">
            {actionError}
          </p>
        )}

        <div className="bg-white rounded-2xl p-1.5 border border-slate-100 shadow-soft flex items-center gap-1 overflow-x-auto no-print" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap ${
                tab === t.id ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {(tab === 'days' || tab === 'map') && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-print" aria-label="Choose a day">
            {itinerary.days.map((d) => (
              <button
                key={d.dayNumber}
                onClick={() => setDayNumber(d.dayNumber)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
                  d.dayNumber === day.dayNumber ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Day {d.dayNumber}
                {d.date ? ` • ${formatDate(d.date)}` : ''}
              </button>
            ))}
          </div>
        )}

        {tab === 'days' && <DayTimeline day={day} />}
        {tab === 'map' && (
          <InteractiveMap
            day={day}
            hotels={itinerary.hotels}
            restaurants={itinerary.restaurants}
            mapStatus={{ state: 'done', notice: itinerary.map?.notice ?? null }}
            title={`Day ${day.dayNumber} - ${day.title}`}
          />
        )}
        {tab === 'stays' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {itinerary.hotels.map((hotel, i) => (
                <HotelCard key={hotel.id || i} hotel={hotel} links={stayLinks(hotel, itinerary)} />
              ))}
            </div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Utensils className="w-5 h-5 text-amber-600" /> Places to eat
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {itinerary.restaurants.map((r, i) => (
                <RestaurantCard key={r.id || i} restaurant={r} links={{ maps: mapsSearchUrl(`${r.name}, ${itinerary.destination}`) }} />
              ))}
            </div>
          </div>
        )}
        {tab === 'costs' && <CostBreakdown itinerary={itinerary} />}

        <div className="text-center pt-4 no-print">
          <Link to="/trips/new" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline">
            <Sparkles className="w-4 h-4" /> Plan your own trip with TripPlanner
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SharedTripPage;
