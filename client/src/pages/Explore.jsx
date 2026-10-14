import { useState, useEffect } from 'react';
import { Search, X, MapPin, ArrowRight } from 'lucide-react';
import { tripApi } from '../services/api';
import DestinationCard from '../components/DestinationCard';
import { useNavigate } from 'react-router-dom';
import { DESTINATION_CATEGORIES, formatINR, tagsToInterests } from '@tripplanner/shared';
import { useTrip } from '../context/TripContext';


export const Explore = () => {
  const navigate = useNavigate();
  const { setCurrentPreferences } = useTrip();

  const [destinations, setDestinations] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDestModal, setSelectedDestModal] = useState(null);

  useEffect(() => {
    const fetchDestinations = async () => {
      setLoading(true);
      try {
        const res = await tripApi.searchDestinations(searchQuery, selectedCategory);
        if (res && res.data) {
          setDestinations(res.data);
        }
      } catch (err) {
        console.error('Failed to search destinations:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchDestinations, 250);
    return () => clearTimeout(debounce);
  }, [searchQuery, selectedCategory]);

  const handlePlanFromModal = (dest) => {
    setCurrentPreferences(prev => ({
      ...prev,
      destination: dest.name,
      interests: tagsToInterests(dest.tags)
    }));
    setSelectedDestModal(null);
    navigate('/create-trip');
  };

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header & Search Bar (Screen 4) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Destination Discovery
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              Top Destinations for You
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Based on your interests, budget and travel style
            </p>
          </div>

          {/* Search Input */}
          <div className="w-full md:w-80 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destinations..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Filter (matching Screen 4) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {DESTINATION_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Destination Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-slate-100"></div>
            ))}
          </div>
        ) : destinations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {destinations.map((dest) => (
              <DestinationCard
                key={dest.id || dest.name}
                destination={dest}
                onQuickView={(d) => setSelectedDestModal(d)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center max-w-md mx-auto border border-slate-100 shadow-soft space-y-3">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">No destinations found</h3>
            <p className="text-xs text-slate-500">
              Try adjusting your search query or switching to another category.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="text-xs font-semibold text-blue-600 hover:underline pt-2 inline-block"
            >
              Reset Filters
            </button>
          </div>
        )}

      </div>

      {/* Details Modal */}
      {selectedDestModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="relative aspect-video w-full bg-slate-100">
              <img
                src={selectedDestModal.image}
                alt={selectedDestModal.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedDestModal(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 text-slate-700 flex items-center justify-center hover:bg-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900">
                  {selectedDestModal.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedDestModal.region}, {selectedDestModal.country}
                </p>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {selectedDestModal.description}
              </p>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Best Time to Visit</span>
                  <span className="font-bold text-slate-800">{selectedDestModal.bestTimeToVisit || 'Oct - Mar'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Avg. Daily Budget</span>
                  <span className="font-bold text-blue-600">{formatINR(selectedDestModal.averageBudgetPerDay || 3200)}/day</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSelectedDestModal(null)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  onClick={() => handlePlanFromModal(selectedDestModal)}
                  className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5"
                >
                  <span>Plan This Trip</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Explore;
