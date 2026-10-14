import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Users, IndianRupee, Sparkles, ArrowRight, ArrowLeft, Check, Loader2, Minus, Plus, AlertCircle } from 'lucide-react';
import {
  BUDGET_TIERS,
  DIETARY_OPTIONS,
  INTERESTS,
  LIMITS,
  POPULAR_DESTINATIONS,
  PREFERENCE_FIELD_STEP,
  STAY_TYPES,
  TRAVEL_STYLES,
  TripPreferencesSchema,
  calcDuration,
  defaultTripDates,
  formatDate,
  formatINR,
  isValidIsoDate,
  suggestBudgetTier,
  todayIso,
  validate,
  validatePreferenceStep,
} from '@tripplanner/shared';
import { useTrip } from '../context/TripContext';
import { interestIcon } from '../constants/ui';

const STEPS = [
  { num: 1, label: 'Destination' },
  { num: 2, label: 'Budget' },
  { num: 3, label: 'Preferences' },
  { num: 4, label: 'Review' },
];

const inputClass = (hasError) =>
  `w-full rounded-xl border text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
    hasError ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-600'
  }`;

const FieldError = ({ message }) =>
  message ? (
    <p className="mt-1 text-[11px] font-semibold text-red-600 flex items-center gap-1" role="alert">
      <AlertCircle className="w-3 h-3" />
      {message}
    </p>
  ) : null;

/** Form state from saved preferences; stale (past) dates are replaced by fresh defaults. */
const initialForm = (prefs) => {
  const datesAreStale = !isValidIsoDate(prefs.startDate) || prefs.startDate < todayIso();
  return {
    destination: prefs.destination ?? '',
    ...(datesAreStale ? defaultTripDates() : { startDate: prefs.startDate, endDate: prefs.endDate }),
    travelersCount: prefs.travelersCount ?? 2,
    totalBudget: String(prefs.totalBudget ?? ''),
    budgetCategory: prefs.budgetCategory ?? 'Moderate',
    interests: prefs.interests ?? [],
    travelStyle: prefs.travelStyle ?? 'Balanced',
    accommodationType: prefs.accommodationType ?? 'Mid-Range Hotel',
    dietaryPreference: prefs.dietaryPreference ?? 'No Restrictions',
    specialNotes: prefs.specialNotes ?? '',
    language: prefs.language ?? 'en',
  };
};

export const CreateTrip = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editTripId = location.state?.editTripId ?? null;
  const { currentPreferences, generateTrip, loading, error, clearError } = useTrip();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(() => initialForm(currentPreferences));
  const [errors, setErrors] = useState({});
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Do not show an error left over from another page.
  useEffect(() => {
    clearError();
  }, [clearError]);

  const update = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const datesValid = isValidIsoDate(formData.startDate) && isValidIsoDate(formData.endDate) && formData.endDate >= formData.startDate;
  const durationDays = datesValid ? calcDuration(formData.startDate, formData.endDate) : null;
  const budgetNumber = Number(formData.totalBudget);
  const perPersonPerDay =
    durationDays && budgetNumber > 0 ? Math.round(budgetNumber / formData.travelersCount / durationDays) : null;
  const suggestedTier = perPersonPerDay ? suggestBudgetTier(budgetNumber, formData.travelersCount, durationDays) : null;

  const toggleInterest = (interest) => {
    update(
      'interests',
      formData.interests.includes(interest) ? formData.interests.filter((i) => i !== interest) : [...formData.interests, interest],
    );
  };

  // Same rules (and messages) as the server: shared schema for this step.
  const handleNext = () => {
    const result = validatePreferenceStep(step, formData);
    if (!result.success) {
      setErrors(result.fields);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, 4));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleGenerate = async () => {
    const result = validate(TripPreferencesSchema, formData);
    if (!result.success) {
      // Jump back to the step that has the problem.
      setErrors(result.fields);
      setStep(PREFERENCE_FIELD_STEP[result.field?.split('.')[0]] ?? 1);
      return;
    }
    try {
      await generateTrip(result.data, { tripId: editTripId });
      navigate('/itinerary');
    } catch {
      // The server message is shown above the form (TripContext → error).
    }
  };

  const matchingDestinations = POPULAR_DESTINATIONS.filter((d) =>
    d.label.toLowerCase().includes(formData.destination.trim().toLowerCase()),
  );

  return (
    <div className="min-h-[calc(100vh-80px)] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-3xl mx-auto">
        {/* Progress stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-xl mx-auto relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
            {STEPS.map((s) => {
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
                  <span className={`text-[11px] font-semibold mt-1.5 ${isCurrent ? 'text-blue-600' : 'text-slate-500'}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-100 shadow-soft">
          <div className="text-center max-w-md mx-auto mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{editTripId ? 'Edit your trip' : 'Tell us about your trip'}</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Help us create a personalized itinerary just for you</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2" role="alert">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* STEP 1: DESTINATION & DATES */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="relative">
                <label htmlFor="destination" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Destination
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-blue-600 absolute left-3 top-3.5" />
                  <input
                    id="destination"
                    type="text"
                    autoComplete="off"
                    value={formData.destination}
                    onChange={(e) => {
                      update('destination', e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setShowSuggestions(false)}
                    placeholder="Where do you want to go? (e.g. Manali, Goa, Jaipur)"
                    maxLength={LIMITS.MAX_DESTINATION_LENGTH}
                    className={`${inputClass(errors.destination)} pl-9 pr-3 py-3`}
                  />
                </div>
                <FieldError message={errors.destination} />

                {showSuggestions && matchingDestinations.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto py-1">
                    {matchingDestinations.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        // onMouseDown runs before the input's onBlur closes the list
                        onMouseDown={(e) => {
                          e.preventDefault();
                          update('destination', item.value);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                      >
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    min={todayIso()}
                    value={formData.startDate}
                    onChange={(e) => update('startDate', e.target.value)}
                    className={`${inputClass(errors.startDate)} px-3.5 py-3 cursor-pointer`}
                  />
                  <FieldError message={errors.startDate} />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    min={formData.startDate || todayIso()}
                    value={formData.endDate}
                    onChange={(e) => update('endDate', e.target.value)}
                    className={`${inputClass(errors.endDate)} px-3.5 py-3 cursor-pointer`}
                  />
                  <FieldError message={errors.endDate} />
                </div>
              </div>

              <div className="bg-blue-50/80 rounded-2xl p-4 border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wide">Calculated Duration</span>
                  <p className="text-lg font-extrabold text-blue-900">
                    {durationDays ? `${durationDays} ${durationDays === 1 ? 'Day' : 'Days'} / ${durationDays - 1} ${durationDays - 1 === 1 ? 'Night' : 'Nights'}` : '—'}
                  </p>
                </div>
                <span className="text-xs text-blue-600 text-right">Up to {LIMITS.MAX_TRIP_DAYS} days</span>
              </div>
            </div>
          )}

          {/* STEP 2: TRAVELERS & BUDGET */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Number of Travelers</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Fewer travelers"
                    disabled={formData.travelersCount <= LIMITS.MIN_TRAVELERS}
                    onClick={() => update('travelersCount', formData.travelersCount - 1)}
                    className="w-11 h-11 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center disabled:opacity-40"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="min-w-[120px] text-center">
                    <p className="text-2xl font-extrabold text-slate-900 flex items-center justify-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      {formData.travelersCount}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formData.travelersCount === 1 ? 'Solo trip' : formData.travelersCount === 2 ? 'Couple / pair' : 'Group trip'}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="More travelers"
                    disabled={formData.travelersCount >= LIMITS.MAX_TRAVELERS}
                    onClick={() => update('travelersCount', formData.travelersCount + 1)}
                    className="w-11 h-11 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <FieldError message={errors.travelersCount} />
              </div>

              <div>
                <label htmlFor="totalBudget" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Total Trip Budget for the group (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    id="totalBudget"
                    type="number"
                    inputMode="numeric"
                    value={formData.totalBudget}
                    onChange={(e) => update('totalBudget', e.target.value)}
                    step="500"
                    min={LIMITS.MIN_BUDGET}
                    placeholder="e.g. 20000"
                    className={`${inputClass(errors.totalBudget)} pl-9 pr-3 py-3`}
                  />
                </div>
                <FieldError message={errors.totalBudget} />
                {perPersonPerDay && !errors.totalBudget && (
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    ≈ <span className="font-semibold text-slate-700">{formatINR(perPersonPerDay)}</span> per person per day
                    {suggestedTier && (
                      <>
                        {' '}
                        • suggested style: <span className="font-semibold text-blue-700">{suggestedTier}</span>
                      </>
                    )}
                  </p>
                )}
              </div>

              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Budget Style</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {BUDGET_TIERS.map((tier) => (
                    <button
                      key={tier.value}
                      type="button"
                      onClick={() => update('budgetCategory', tier.value)}
                      className={`p-3 rounded-xl text-left transition-all ${
                        formData.budgetCategory === tier.value
                          ? 'bg-blue-50 text-blue-900 border-2 border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="font-bold text-xs block">{tier.label}</span>
                      <span className="text-[10px] text-slate-500">{tier.hint}</span>
                    </button>
                  ))}
                </div>
                <FieldError message={errors.budgetCategory} />
              </div>
            </div>
          )}

          {/* STEP 3: PREFERENCES */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Your Interests (select any)</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {INTERESTS.map((interest) => {
                    const isSelected = formData.interests.includes(interest);
                    const Icon = interestIcon(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => toggleInterest(interest)}
                        className={`flex items-center gap-2 p-3 rounded-xl text-xs font-semibold transition-all text-left ${
                          isSelected ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600' : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                        <span className="truncate">{interest}</span>
                      </button>
                    );
                  })}
                </div>
                <FieldError message={errors.interests} />
              </div>

              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Travel Pace</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {TRAVEL_STYLES.map((style) => (
                    <button
                      key={style.value}
                      type="button"
                      onClick={() => update('travelStyle', style.value)}
                      className={`p-3 rounded-xl text-left transition-all ${
                        formData.travelStyle === style.value
                          ? 'bg-blue-50 text-blue-900 border-2 border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="font-bold text-xs block">{style.label}</span>
                      <span className="text-[10px] text-slate-500">{style.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="accommodationType" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Stay Type
                  </label>
                  <select
                    id="accommodationType"
                    value={formData.accommodationType}
                    onChange={(e) => update('accommodationType', e.target.value)}
                    className={`${inputClass(errors.accommodationType)} px-3 py-3 bg-white cursor-pointer`}
                  >
                    {STAY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="dietaryPreference" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Food Preference
                  </label>
                  <select
                    id="dietaryPreference"
                    value={formData.dietaryPreference}
                    onChange={(e) => update('dietaryPreference', e.target.value)}
                    className={`${inputClass(errors.dietaryPreference)} px-3 py-3 bg-white cursor-pointer`}
                  >
                    {DIETARY_OPTIONS.map((diet) => (
                      <option key={diet} value={diet}>
                        {diet}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="specialNotes" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Special Preferences (optional)
                </label>
                <textarea
                  id="specialNotes"
                  value={formData.specialNotes}
                  onChange={(e) => update('specialNotes', e.target.value)}
                  rows="3"
                  maxLength={LIMITS.MAX_NOTES_LENGTH}
                  placeholder="e.g. I love peaceful places, want less crowded spots, prefer morning hikes..."
                  className={`${inputClass(errors.specialNotes)} p-3 text-xs sm:text-sm font-normal`}
                />
                <div className="flex justify-between">
                  <FieldError message={errors.specialNotes} />
                  <span className="ml-auto text-[10px] text-slate-400">
                    {formData.specialNotes.length}/{LIMITS.MAX_NOTES_LENGTH}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 text-xs">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">Trip Summary Review</h3>
                <dl className="grid grid-cols-2 gap-3">
                  {[
                    ['Destination', formData.destination],
                    ['Dates', datesValid ? `${formatDate(formData.startDate)} – ${formatDate(formData.endDate)}` : '—'],
                    ['Duration', durationDays ? `${durationDays} days` : '—'],
                    ['Travelers', `${formData.travelersCount} ${formData.travelersCount === 1 ? 'person' : 'people'}`],
                    ['Budget', `${budgetNumber > 0 ? formatINR(budgetNumber) : '—'} (${formData.budgetCategory})`],
                    ['Travel Pace', formData.travelStyle],
                    ['Stay', formData.accommodationType],
                    ['Food', formData.dietaryPreference],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-slate-400 font-semibold uppercase text-[10px]">{label}</dt>
                      <dd className="font-bold text-slate-800 text-sm">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px] mb-1">Selected Interests</span>
                  <div className="flex flex-wrap gap-1">
                    {formData.interests.length === 0 && <span className="text-slate-500">None selected</span>}
                    {formData.interests.map((interest) => (
                      <span key={interest} className="bg-blue-100/70 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>

                {formData.specialNotes && (
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase text-[10px]">Notes</span>
                    <p className="text-slate-600 italic">&ldquo;{formData.specialNotes}&rdquo;</p>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>We will build a day-wise itinerary with a budget breakdown, stays, restaurants and a map.</span>
              </div>
            </div>
          )}

          {/* Navigation */}
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
              <div />
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
                    <span>Building your itinerary...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{editTripId ? 'Regenerate Itinerary' : 'Generate My Itinerary'}</span>
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
