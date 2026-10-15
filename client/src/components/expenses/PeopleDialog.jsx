import { useEffect, useId, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { LIMITS, TripMembersSchema, validate } from '@tripplanner/shared';

/**
 * Part 15 — the people sharing the costs: rename, add, remove. Only names (friends need no account).
 * Someone who is in an expense can not be removed — the server says which, and it is shown here.
 */
export const PeopleDialog = ({ members, onSubmit, onClose }) => {
  const id = useId();
  const [list, setList] = useState(() => members.map((m) => ({ ...m })));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    const body = { members: list.map((m) => ({ ...(m.id && { id: m.id }), name: m.name })) };
    const checked = validate(TripMembersSchema, body);
    if (!checked.success) {
      setErrors(checked.fields);
      return;
    }
    setBusy(true);
    const result = await onSubmit(checked.data.members);
    setBusy(false);
    if (result?.ok === false) setErrors({ ...result.fields, _: result.error });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in no-print">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        onSubmit={submit}
        noValidate
        className="bg-white w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4"
        data-testid="people-dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id={`${id}-title`} className="text-lg font-bold text-slate-900">
              Who is sharing the costs?
            </h3>
            <p className="text-xs text-slate-500">Just names — your friends do not need an account.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <ul className="space-y-2">
          {list.map((m, i) => (
            <li key={m.id ?? `new-${i}`}>
              <div className="flex gap-2">
                <input
                  value={m.name}
                  autoFocus={i === list.length - 1 && !m.id}
                  onChange={(e) => setList((l) => l.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))}
                  maxLength={40}
                  aria-label={`Person ${i + 1}`}
                  className={`flex-1 px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors[`members.${i}.name`] ? 'border-red-300 bg-red-50/40' : 'border-slate-200'}`}
                />
                <button
                  type="button"
                  onClick={() => setList((l) => l.filter((_, k) => k !== i))}
                  disabled={list.length <= 1}
                  aria-label={`Remove ${m.name || `person ${i + 1}`}`}
                  className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-300 disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {errors[`members.${i}.name`] && <p className="text-[11px] font-semibold text-red-600 mt-1">{errors[`members.${i}.name`]}</p>}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setList((l) => [...l, { name: '' }])}
          disabled={list.length >= LIMITS.MAX_TRIP_MEMBERS}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" /> Add a person
        </button>

        {(errors._ || (errors.members && !Object.keys(errors).some((k) => k.startsWith('members.')))) && (
          <p className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700" role="alert">
            {errors._ ?? errors.members}
          </p>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60">
            {busy ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PeopleDialog;
