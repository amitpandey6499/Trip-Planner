import { useCallback, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Link2,
  Plus,
  Calendar,
  Users,
  Trash2,
  Edit3,
  ArrowRight,
  Search,
  Clock,
  Sparkles,
  Loader2
} from 'lucide-react';
import { formatDate, formatINR, tripPhase } from '@tripplanner/shared';
import { useTrip } from '../context/TripContext';
import TripTitle from '../components/TripTitle';
import ConfirmDialog from '../components/ConfirmDialog';

const TABS = ['Upcoming', 'Ongoing', 'Past', 'All'];
const SORTS = {
  newest: { label: 'Newest first', compare: (a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')) },
  start: { label: 'Start date', compare: (a, b) => a.startDate.localeCompare(b.startDate) },
  budget: { label: 'Budget (high → low)', compare: (a, b) => b.totalBudget - a.totalBudget },
};
const PHASE_STYLES = {
  Upcoming: 'bg-blue-50 text-blue-700 border-blue-200/60',
  Ongoing: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  Past: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const MyTrips = () => {
  const navigate = useNavigate();
  const { savedTrips, deleteTrip, renameTrip, tripsLoading, currentItinerary, currentTripId, isDirty } = useTrip();

  const [activeTab, setActiveTab] = useState('Upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [tripToDelete, setTripToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  // { path, title } of a trip the user wants to open while another plan has unsaved changes
  const [pendingOpen, setPendingOpen] = useState(null);

  // Phase is calculated from the dates (shared tripPhase), so "Past" fills itself.
  const trips = savedTrips.map((trip) => ({ ...trip, phase: tripPhase(trip.startDate, trip.endDate) }));
  const query = searchQuery.trim().toLowerCase();
  const filteredTrips = trips.filter((trip) => {
    const matchesTab = activeTab === 'All' || trip.phase === activeTab;
    const matchesSearch =
      !query || (trip.destination ?? '').toLowerCase().includes(query) || (trip.title ?? '').toLowerCase().includes(query);
    return matchesTab && matchesSearch;
  }).sort(SORTS[sortBy].compare);
  const countFor = (tab) => (tab === 'All' ? trips.length : trips.filter((t) => t.phase === tab).length);

  // Every trip has its own address (Part 5); the pages load the trip from the URL.
  // Only one plan is kept in memory, so opening ANOTHER trip would throw away unsaved changes: ask first.
  const hasUnsavedPlan = Boolean(currentItinerary) && isDirty;
  const open = (trip, path) => {
    if (hasUnsavedPlan && trip.id !== currentTripId) setPendingOpen({ path, title: trip.title });
    else navigate(path);
  };
  const handleView = (trip) => open(trip, `/trips/${trip.id}`);
  const handleEdit = (trip) => open(trip, `/trips/${trip.id}/edit`);
  const closePendingOpen = useCallback(() => setPendingOpen(null), []);
  const closeDelete = useCallback(() => setTripToDelete(null), []);

  const confirmDelete = async () => {
    if (!tripToDelete) return;
    setDeleting(true);
    await deleteTrip(tripToDelete.id);
    setDeleting(false);
    setTripToDelete(null);
  };

  return (
    <div className="min-h-screen py-8 sm:py-10 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Create Button (Screen 9) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              My Trips
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              View and manage your planned trips
            </p>
          </div>

          <Link
            to="/trips/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Trip</span>
          </Link>
        </div>

        {/* Filter Tabs & Search Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Tabs */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200/80 shadow-2xs self-start">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab} <span className="opacity-70">({countFor(tab)})</span>
              </button>
            ))}
          </div>

          {/* Sort + search */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="sr-only" htmlFor="trip-sort">Sort trips</label>
            <select
              id="trip-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="py-2 px-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {Object.entries(SORTS).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <div className="w-full sm:w-64 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved trips..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

        </div>

        {/* Trips List / Grid */}
        {tripsLoading && savedTrips.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> Loading your trips...
          </div>
        ) : filteredTrips.length > 0 ? (
          <div className="space-y-4">
            {filteredTrips.map((trip) => (
              <div
                key={trip.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-soft hover:shadow-soft-lg transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Left Thumbnail & Info */}
                <div className="flex items-center gap-4">
                  <div className="w-20 sm:w-28 h-20 sm:h-24 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                    <img
                      src={trip.destinationImage || 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=400&q=80'}
                      alt={trip.destination}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${PHASE_STYLES[trip.phase]}`}>
                        {trip.phase}
                      </span>
                      {trip.share?.enabled && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1"
                          title={`Anyone with the link can view it • opened ${trip.share.views ?? 0} times`}
                          data-testid="shared-badge"
                        >
                          <Link2 className="w-3 h-3" /> Shared
                        </span>
                      )}
                      {trip.createdAt && (
                        <span className="text-xs text-slate-400">Created {new Date(trip.createdAt).toLocaleDateString('en-IN')}</span>
                      )}
                    </div>

                    <TripTitle trip={trip} onRename={renameTrip} />

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(trip.startDate)} {trip.endDate ? `– ${formatDate(trip.endDate)}` : ''}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {trip.durationDays} {trip.durationDays === 1 ? 'Day' : 'Days'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {trip.travelersCount} {trip.travelersCount === 1 ? 'Traveler' : 'Travelers'}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-blue-600">
                      Budget: {formatINR(trip.totalBudget)}
                    </p>
                  </div>
                </div>

                {/* Right Action Buttons matching Screen 9 */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <button
                    onClick={() => handleView(trip)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <span>View Itinerary</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleEdit(trip)}
                    className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1"
                    title="Edit trip parameters"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => setTripToDelete(trip)}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                    title="Delete saved trip"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center max-w-md mx-auto border border-slate-100 shadow-soft space-y-4">
            <Sparkles className="w-12 h-12 text-blue-400 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">No {activeTab === 'All' ? '' : `${activeTab.toLowerCase()} `}trips found</h3>
            <p className="text-xs text-slate-500">
              Start planning your next getaway with the AI itinerary generator.
            </p>
            <Link
              to="/trips/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create a Trip Now</span>
            </Link>
          </div>
        )}

      </div>

      {tripToDelete && (
        <ConfirmDialog title="Delete Trip" confirmLabel={deleting ? 'Deleting...' : 'Yes, Delete'} busy={deleting} onConfirm={confirmDelete} onCancel={closeDelete}>
          <p>
            Are you sure you want to delete <span className="font-bold text-slate-700">{tripToDelete.title}</span>? This action cannot be undone.
          </p>
        </ConfirmDialog>
      )}

      {pendingOpen && (
        <ConfirmDialog
          tone="warning"
          title="Discard unsaved changes?"
          confirmLabel="Discard and open"
          onConfirm={() => navigate(pendingOpen.path)}
          onCancel={closePendingOpen}
        >
          <p>
            <span className="font-bold text-slate-700">{currentItinerary.title}</span>{' '}
            {currentTripId ? 'has changes that are not saved.' : 'is a new plan that is not saved yet.'} Opening{' '}
            <span className="font-bold text-slate-700">{pendingOpen.title}</span> will discard {currentTripId ? 'them' : 'it'}.
          </p>
          <p>
            To keep it,{' '}
            <Link to={currentTripId ? `/trips/${currentTripId}` : '/itinerary'} className="text-blue-600 font-semibold hover:underline">
              go back to it
            </Link>{' '}
            and press Save.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
};

export default MyTrips;
