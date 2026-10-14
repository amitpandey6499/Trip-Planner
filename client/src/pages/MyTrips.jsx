import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus,
  Calendar,
  Users,
  Trash2,
  Edit3,
  ArrowRight,
  Search,
  Clock,
  Sparkles,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useTrip } from '../context/TripContext';

export const MyTrips = () => {
  const navigate = useNavigate();
  const { savedTrips, deleteTrip, loadTripById, loading } = useTrip();

  const [activeTab, setActiveTab] = useState('Upcoming'); // 'Upcoming' | 'Past' | 'Saved'
  const [searchQuery, setSearchQuery] = useState('');
  const [tripToDelete, setTripToDelete] = useState(null);

  const filteredTrips = savedTrips.filter(trip => {
    const matchesTab = activeTab === 'Saved' ? true : (trip.status || 'Upcoming').toLowerCase() === activeTab.toLowerCase();
    const matchesSearch = trip.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          trip.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleView = async (tripId) => {
    await loadTripById(tripId);
    navigate('/itinerary');
  };

  const confirmDelete = async () => {
    if (tripToDelete) {
      await deleteTrip(tripToDelete.id);
      setTripToDelete(null);
    }
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
            to="/create-trip"
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
            {['Upcoming', 'Past', 'Saved'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search bar */}
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

        {/* Trips List / Grid */}
        {loading && savedTrips.length === 0 ? (
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
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 uppercase tracking-wide">
                        {trip.status || 'Upcoming'}
                      </span>
                      <span className="text-xs text-slate-400">
                        Created {new Date(trip.createdAt || Date.now()).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {trip.title || `${trip.destination} Trip`}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {trip.startDate} {trip.endDate ? `– ${trip.endDate}` : ''}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {trip.durationDays || 4} Days
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {trip.travelersCount || 2} Travelers
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-blue-600">
                      Est. Budget: ₹{(trip.totalBudget || 15000).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Right Action Buttons matching Screen 9 */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <button
                    onClick={() => handleView(trip.id)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <span>View Itinerary</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      loadTripById(trip.id);
                      navigate('/create-trip');
                    }}
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
            <h3 className="text-lg font-bold text-slate-800">No {activeTab} Trips Found</h3>
            <p className="text-xs text-slate-500">
              Start planning your next getaway with the AI itinerary generator.
            </p>
            <Link
              to="/create-trip"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create a Trip Now</span>
            </Link>
          </div>
        )}

      </div>

      {/* Delete Confirmation Modal */}
      {tripToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Delete Trip</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-bold text-slate-700">{tripToDelete.title}</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setTripToDelete(null)}
                className="w-1/2 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="w-1/2 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MyTrips;
