import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Users,
  IndianRupee,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  TreePine,
  Compass,
  Landmark,
  Utensils,
  SunMedium,
  ShoppingBag,
  Bird,
  Music,
  HeartHandshake,
  Camera,
  Flame,
  Gem,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useTrip } from '../context/TripContext';

// Available interest tags matching Screen 3
const interestOptions = [
  { id: 'Nature & Outdoors', label: 'Nature & Outdoors', icon: TreePine },
  { id: 'Adventure', label: 'Adventure', icon: Compass },
  { id: 'History & Culture', label: 'History & Culture', icon: Landmark },
  { id: 'Food & Cuisine', label: 'Food & Cuisine', icon: Utensils },
  { id: 'Beaches', label: 'Beaches', icon: SunMedium },
  { id: 'Shopping', label: 'Shopping', icon: ShoppingBag },
  { id: 'Wildlife', label: 'Wildlife', icon: Bird },
  { id: 'Nightlife', label: 'Nightlife', icon: Music },
  { id: 'Relaxation', label: 'Relaxation', icon: HeartHandshake },
  { id: 'Photography', label: 'Photography', icon: Camera },
  { id: 'Spiritual Places', label: 'Spiritual Places', icon: Flame },
  { id: 'Hidden Gems', label: 'Hidden Gems', icon: Gem },
];

const popularDestinations = [
  'Manali, Himachal Pradesh',
  'Goa, India',
  'Jaipur, Rajasthan',
  'Udaipur, Rajasthan',
  'Varanasi, Uttar Pradesh',
  'Kerala (Munnar & Alleppey)',
  'Andaman & Nicobar Islands',
  'Rishikesh, Uttarakhand'
];

export const CreateTrip = () => {
  const navigate = useNavigate();
  const { currentPreferences, setCurrentPreferences, generateTrip, loading, error } = useTrip();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    destination: currentPreferences.destination || 'Manali',
    startDate: currentPreferences.startDate || '2026-11-12',
    endDate: currentPreferences.endDate || '2026-11-15',
    durationDays: currentPreferences.durationDays || 4,
    travelersCount: currentPreferences.travelersCount || 2,
    totalBudget: currentPreferences.totalBudget || 15000,
    budgetCategory: currentPreferences.budgetCategory || 'Moderate',
    interests: currentPreferences.interests || ['Nature & Outdoors', 'Adventure', 'Food & Cuisine'],
    travelStyle: currentPreferences.travelStyle || 'Balanced',
    accommodationType: currentPreferences.accommodationType || 'Mid-Range Hotel',
    dietaryPreference: currentPreferences.dietaryPreference || 'No Restrictions',
    specialNotes: currentPreferences.specialNotes || 'Looking for scenic views, snow activities and local cafes.'
  });

  const [destSuggestions, setDestSuggestions] = useState(false);

  // Auto calculate duration when dates change
  const handleDateChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    if (updated.startDate && updated.endDate) {
      const start = new Date(updated.startDate);
      const end = new Date(updated.endDate);
      if (end >= start) {
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        updated.durationDays = diffDays;
      }
    }
    setFormData(updated);
  };

  const toggleInterest = (id) => {
    setFormData(prev => {
      const exists = prev.interests.includes(id);
      if (exists) {
        return { ...prev, interests: prev.interests.filter(i => i !== id) };
      } else {
        return { ...prev, interests: [...prev.interests, id] };
      }
    });
  };

  const handleNext = () => {
    if (step === 1 && !formData.destination.trim()) {
      alert('Please enter a destination.');
      return;
    }
    setStep(prev => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleGenerate = async () => {
    const cleaned = {
      ...formData,
      destination: formData.destination.split(',')[0].trim()
    };
    setCurrentPreferences(cleaned);
    try {
      await generateTrip(cleaned);
      navigate('/itinerary');
    } catch (err) {
      console.error('Trip generation error:', err);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-3xl mx-auto">
        
        {/* Progress Stepper Header (matching Screen 3) */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-xl mx-auto relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0"></div>
            
            {[
              { num: 1, label: 'Destination' },
              { num: 2, label: 'Budget' },
              { num: 3, label: 'Preferences' },
              { num: 4, label: 'Review' }
            ].map((s) => {
              const isCompleted = step > s.num;
              const isCurrent = step === s.num;

              return (
                <div key={s.num} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      isCompleted
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md'
                        : 'bg-white text-slate-400 border border-slate-300'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span
                    className={`text-[11px] font-semibold mt-1.5 transition-colors ${
                      isCurrent ? 'text-blue-600' : 'text-slate-500'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Main Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-100 shadow-soft">
          
          {/* Header */}
          <div className="text-center max-w-md mx-auto mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Tell us about your trip
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Help us create a personalized itinerary just for you
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
              {error}
            </div>
          )}

          {/* STEP 1: DESTINATION & DATES */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Destination
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-blue-600 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => {
                      setFormData({ ...formData, destination: e.target.value });
                      setDestSuggestions(true);
                    }}
                    onFocus={() => setDestSuggestions(true)}
                    placeholder="Where do you want to go? (e.g. Manali, Goa, Jaipur)"
                    className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    required
                  />
                </div>

                {destSuggestions && (
                  <div
                    className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto py-1"
                    onMouseLeave={() => setDestSuggestions(false)}
                  >
                    {popularDestinations
                      .filter(d => d.toLowerCase().includes(formData.destination.toLowerCase()))
                      .map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, destination: item });
                            setDestSuggestions(false);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                        >
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {item}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleDateChange('startDate', e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleDateChange('endDate', e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              <div className="bg-blue-50/80 rounded-2xl p-4 border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wide">
                    Calculated Duration
                  </span>
                  <p className="text-lg font-extrabold text-blue-900">
                    {formData.durationDays} Days / {formData.durationDays - 1} Nights
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-blue-600">
                    Optimal for full day-wise plans
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: TRAVELERS & BUDGET */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Number of Travelers
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFormData({ ...formData, travelersCount: num })}
                      className={`py-3 rounded-xl text-sm font-bold flex flex-col items-center justify-center transition-all ${
                        formData.travelersCount === num
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-600'
                          : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Users className="w-4 h-4 mb-1" />
                      <span>{num} {num === 1 ? 'Solo' : 'People'}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Total Trip Budget (in INR ₹)
                </label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="number"
                    value={formData.totalBudget}
                    onChange={(e) => setFormData({ ...formData, totalBudget: parseInt(e.target.value, 10) || 5000 })}
                    step="1000"
                    min="3000"
                    max="500000"
                    className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Budget Style
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'Budget', label: 'Budget Friendly', desc: '₹5k - ₹15k' },
                    { id: 'Moderate', label: 'Moderate / Balanced', desc: '₹15k - ₹40k' },
                    { id: 'Luxury', label: 'Luxury Experience', desc: '₹40k+' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, budgetCategory: b.id })}
                      className={`p-3 rounded-xl text-left transition-all ${
                        formData.budgetCategory === b.id
                          ? 'bg-blue-50 text-blue-900 border-2 border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="font-bold text-xs block">{b.label}</span>
                      <span className="text-[10px] text-slate-500">{b.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: INTERESTS & PREFERENCES (Matching Screen 3) */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Your Interests (Select multiple)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {interestOptions.map((item) => {
                    const isSelected = formData.interests.includes(item.id);
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleInterest(item.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl text-xs font-semibold transition-all text-left ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600'
                            : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Special Preferences (Optional)
                </label>
                <textarea
                  value={formData.specialNotes}
                  onChange={(e) => setFormData({ ...formData, specialNotes: e.target.value })}
                  rows="3"
                  placeholder="e.g. I love peaceful places, want less crowded spots, prefer morning hikes..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                ></textarea>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & CONFIRM */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 text-xs">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">
                  Trip Summary Review
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase text-[10px]">Destination</span>
                    <span className="font-bold text-slate-800 text-sm">{formData.destination}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase text-[10px]">Duration</span>
                    <span className="font-bold text-slate-800 text-sm">{formData.durationDays} Days</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase text-[10px]">Travelers</span>
                    <span className="font-bold text-slate-800 text-sm">{formData.travelersCount} Person(s)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase text-[10px]">Budget</span>
                    <span className="font-bold text-blue-600 text-sm">₹{formData.totalBudget.toLocaleString()} ({formData.budgetCategory})</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px] mb-1">Selected Interests</span>
                  <div className="flex flex-wrap gap-1">
                    {formData.interests.map((i, idx) => (
                      <span key={idx} className="bg-blue-100/70 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                        {i}
                      </span>
                    ))}
                  </div>
                </div>

                {formData.specialNotes && (
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase text-[10px]">Notes</span>
                    <p className="text-slate-600 italic">"{formData.specialNotes}"</p>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>
                  Our AI model will construct a day-wise itinerary, budget breakdown, hotels, restaurants, and interactive map routes.
                </span>
              </div>
            </div>
          )}

          {/* Bottom Navigation Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs sm:text-sm transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div></div>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all disabled:opacity-75"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Synthesizing Itinerary...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Generate My Itinerary</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default CreateTrip;
