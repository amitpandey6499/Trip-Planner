import { useEffect, useId, useMemo, useState } from 'react';
import { Lightbulb, Plus, Save, X } from 'lucide-react';
import {
  ACTIVITY_CATEGORIES,
  ActivityInputSchema,
  LIMITS,
  formatClock,
  formatDate,
  formatTimeSlot,
  fromTimeInput,
  parseTimeSlot,
  toTimeInput,
  validate,
} from '@tripplanner/shared';

// Where an activity's cost is counted in the Cost Breakdown (shared ACTIVITY_BUDGET_BUCKET).
const CATEGORY_HINT = {
  Attraction: 'sightseeing',
  Activity: 'sightseeing',
  Shopping: 'sightseeing',
  Restaurant: 'food',
  Transit: 'local transport',
  Hotel: 'stay',
};

const inputClass = (error) =>
  `w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${error ? 'border-red-300 bg-red-50/40' : 'border-slate-200'}`;

const Field = ({ id, label, hint, error, children }) => (
  <div>
    <label htmlFor={id} className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
      {label}
    </label>
    {children}
    {error ? <p className="text-[11px] font-semibold text-red-600 mt-1">{error}</p> : hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
  </div>
);

const initialForm = (activity, dayNumber) => {
  const slot = parseTimeSlot(activity?.timeSlot);
  return {
    placeName: activity?.placeName ?? '',
    category: activity?.category ?? 'Attraction',
    start: toTimeInput(slot?.start),
    end: toTimeInput(slot?.end),
    estimatedDuration: activity?.estimatedDuration ?? '',
    cost: activity ? String(activity.cost ?? 0) : '',
    description: activity?.description ?? '',
    tips: activity?.tips ?? '',
    dayNumber,
  };
};

/**
 * Part 12 — add an activity to a day, or change one (incl. moving it to another day).
 * Checked with the same rules as the server (shared ActivityInputSchema); the parent applies the edits
 * and gets { ok, error } back, so a refused change (e.g. a full day) is shown here.
 */
export const ActivityDialog = ({ activity = null, dayNumber, days, travelers = 1, suggestions = [], onSubmit, onClose }) => {
  const id = useId();
  const adding = !activity;
  const [form, setForm] = useState(() => initialForm(activity, dayNumber));
  const [errors, setErrors] = useState({});
  // The idea the form was filled from: its known position is used while the name stays the same.
  const [idea, setIdea] = useState(null);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  // Text like "All day" has no clock time: it is kept unless the user picks times.
  const oldSlotText = activity && !parseTimeSlot(activity.timeSlot) ? activity.timeSlot : '';
  const fullDay = (n) => days.find((d) => d.dayNumber === n)?.activities.length >= LIMITS.MAX_ACTIVITIES_PER_DAY;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ideas = useMemo(() => suggestions.filter((s) => s.placeName.toLowerCase() !== form.placeName.trim().toLowerCase()).slice(0, 8), [suggestions, form.placeName]);
  const applyIdea = (choice) => {
    setIdea(choice);
    setErrors({});
    setForm((f) => ({
      ...f,
      placeName: choice.placeName,
      category: choice.category,
      estimatedDuration: choice.estimatedDuration ?? '',
      description: choice.description ?? '',
      tips: choice.tips ?? '',
      cost: choice.cost ? String(choice.cost) : '',
    }));
  };
  const fromIdea = idea && idea.placeName === form.placeName.trim() ? idea : null;
  // "Jogini Waterfall" when "Jogini Waterfall Trek" is already on Day 1 → say so (adding it again is still allowed).
  const alreadyIn = useMemo(() => {
    const name = form.placeName.trim().toLowerCase();
    if (name.length < 4) return null;
    for (const d of days) {
      const same = d.activities.find((a) => a !== activity && (a.placeName.toLowerCase().includes(name) || name.includes(a.placeName.toLowerCase())));
      if (same) return { dayNumber: d.dayNumber, placeName: same.placeName };
    }
    return null;
  }, [form.placeName, days, activity]);

  const timeSlot = () => {
    const start = fromTimeInput(form.start);
    const end = fromTimeInput(form.end);
    if (start === null && end === null) return { value: oldSlotText };
    if (start === null) return { error: { start: 'Add a start time too (or clear the end time).' } };
    if (end !== null && end <= start) return { error: { end: 'End time must be after the start time.' } };
    return { value: formatTimeSlot(start, end) };
  };

  const submit = (e) => {
    e.preventDefault();
    const time = timeSlot();
    const input = {
      placeName: form.placeName,
      category: form.category,
      timeSlot: time.value ?? '',
      estimatedDuration: form.estimatedDuration.trim() || undefined,
      cost: form.category === 'Hotel' ? 0 : form.cost,
      description: form.description,
      tips: form.tips.trim() || undefined,
      ...(adding && fromIdea?.coordinates && { coordinates: fromIdea.coordinates }),
    };
    const checked = validate(ActivityInputSchema, input);
    const fieldErrors = { ...(checked.success ? {} : checked.fields), ...(time.error ?? {}) };
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }
    const value = checked.data;
    const targetDay = Number(form.dayNumber);

    let edits;
    if (adding) {
      edits = [{ type: 'add', dayNumber: targetDay, activity: value }];
    } else {
      // Only what really changed (so "Undo" and the map do no extra work).
      const before = { ...initialForm(activity, dayNumber), timeSlot: activity.timeSlot ?? '' };
      const changes = {};
      for (const key of ['placeName', 'category', 'timeSlot', 'description']) if ((value[key] ?? '') !== (before[key] ?? '')) changes[key] = value[key];
      if ((value.estimatedDuration ?? '') !== (activity.estimatedDuration ?? '')) changes.estimatedDuration = value.estimatedDuration ?? '';
      if ((value.tips ?? '') !== (activity.tips ?? '')) changes.tips = value.tips ?? '';
      if (value.cost !== (activity.cost ?? 0)) changes.cost = value.cost;
      edits = [];
      if (Object.keys(changes).length) edits.push({ type: 'update', dayNumber, activityId: String(activity.id), changes });
      if (targetDay !== dayNumber) edits.push({ type: 'move', fromDay: dayNumber, activityId: String(activity.id), toDay: targetDay });
      if (!edits.length) return onClose();
    }
    const result = onSubmit(edits, { targetDay, placeName: value.placeName });
    if (result?.ok === false) setErrors({ _: result.error });
  };

  const dayOptions = days.map((d) => (
    <option key={d.dayNumber} value={d.dayNumber} disabled={d.dayNumber !== dayNumber && fullDay(d.dayNumber)}>
      Day {d.dayNumber}
      {d.date ? ` • ${formatDate(d.date)}` : ''}
      {d.title ? ` — ${d.title}` : ''}
    </option>
  ));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in no-print">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        onSubmit={submit}
        noValidate
        className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4"
        data-testid="activity-dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 id={`${id}-title`} className="text-lg font-bold text-slate-900">
            {adding ? `Add an activity to Day ${form.dayNumber}` : `Edit “${activity.placeName}”`}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {adding && (ideas.length > 0 || fromIdea) && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Ideas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ideas.map((choice) => (
                <button
                  key={choice.placeName}
                  type="button"
                  onClick={() => applyIdea(choice)}
                  title={choice.description || undefined}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50 text-xs font-semibold text-slate-700"
                  data-testid="idea"
                >
                  {choice.placeName}
                </button>
              ))}
            </div>
            {fromIdea && (
              <p className="text-[11px] text-emerald-700 mt-1.5">
                Filled in from our list{fromIdea.coordinates ? ' (with its place on the map)' : ''}. Prices are estimates — change anything you like.
              </p>
            )}
          </div>
        )}

        <Field id={`${id}-name`} label="Place or activity *" error={errors.placeName} hint="Use the real name (e.g. “Jogini Waterfall”) so it can be found on the map.">
          <input
            id={`${id}-name`}
            autoFocus
            value={form.placeName}
            onChange={set('placeName')}
            maxLength={120}
            placeholder="e.g. Hadimba Temple"
            className={inputClass(errors.placeName)}
          />
          {alreadyIn && !errors.placeName && (
            <p className="text-[11px] font-semibold text-amber-700 mt-1" data-testid="already-in-plan">
              Already in your plan on Day {alreadyIn.dayNumber}: {alreadyIn.placeName}.
            </p>
          )}
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field id={`${id}-category`} label="Type" error={errors.category} hint={`Cost counts as ${CATEGORY_HINT[form.category] ?? 'sightseeing'}.`}>
            <select id={`${id}-category`} value={form.category} onChange={set('category')} className={inputClass(errors.category)}>
              {ACTIVITY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field id={`${id}-day`} label="Day" hint={!adding && Number(form.dayNumber) !== dayNumber ? 'It moves to that day, at its time.' : null}>
            <select id={`${id}-day`} value={form.dayNumber} onChange={set('dayNumber')} className={inputClass(false)}>
              {dayOptions}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field id={`${id}-start`} label="Start time" error={errors.start}>
            <input id={`${id}-start`} type="time" value={form.start} onChange={set('start')} className={inputClass(errors.start)} />
          </Field>
          <Field id={`${id}-end`} label="End time" error={errors.end}>
            <input id={`${id}-end`} type="time" value={form.end} onChange={set('end')} className={inputClass(errors.end)} />
          </Field>
        </div>
        <p className="text-[11px] text-slate-500 -mt-2">
          {errors.timeSlot ??
            (oldSlotText
              ? `Now: “${oldSlotText}”. Leave both empty to keep it.`
              : form.start
                ? `Shown as ${fromTimeInput(form.end) !== null && fromTimeInput(form.end) > fromTimeInput(form.start) ? formatTimeSlot(fromTimeInput(form.start), fromTimeInput(form.end)) : formatClock(fromTimeInput(form.start))}. It is placed in the day by its time.`
                : 'Leave both empty for no fixed time.')}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field
            id={`${id}-cost`}
            label="Cost (₹)"
            error={errors.cost}
            hint={form.category === 'Hotel' ? 'Room costs are in Accommodation (Cost Breakdown).' : `For the whole group (${travelers} ${travelers === 1 ? 'traveller' : 'travellers'}).`}
          >
            <input
              id={`${id}-cost`}
              inputMode="numeric"
              value={form.category === 'Hotel' ? '0' : form.cost}
              onChange={set('cost')}
              disabled={form.category === 'Hotel'}
              placeholder="0"
              className={`${inputClass(errors.cost)} disabled:bg-slate-100`}
            />
          </Field>
          <Field id={`${id}-duration`} label="Duration" error={errors.estimatedDuration}>
            <input id={`${id}-duration`} value={form.estimatedDuration} onChange={set('estimatedDuration')} maxLength={40} placeholder="e.g. 2 hours" className={inputClass(errors.estimatedDuration)} />
          </Field>
        </div>

        <Field id={`${id}-description`} label="Description" error={errors.description}>
          <textarea id={`${id}-description`} rows={2} value={form.description} onChange={set('description')} maxLength={1000} className={inputClass(errors.description)} />
        </Field>
        <Field id={`${id}-tips`} label="Tip" error={errors.tips}>
          <input id={`${id}-tips`} value={form.tips} onChange={set('tips')} maxLength={500} placeholder="e.g. Go before 9 AM to skip the crowd" className={inputClass(errors.tips)} />
        </Field>

        {errors._ && (
          <p className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700" role="alert">
            {errors._}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5">
            {adding ? <Plus className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {adding ? 'Add to the day' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ActivityDialog;
