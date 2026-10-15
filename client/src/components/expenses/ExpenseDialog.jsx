import { useEffect, useId, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { EXPENSE_CATEGORIES, ExpenseInputSchema, formatPaise, paiseToRupees, splitEvenly, toPaise, validate } from '@tripplanner/shared';

const inputClass = (error) =>
  `w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${error ? 'border-red-300 bg-red-50/40' : 'border-slate-200'}`;

const Field = ({ id, label, error, hint, children }) => (
  <div>
    <label htmlFor={id} className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
      {label}
    </label>
    {children}
    {error ? <p className="text-[11px] font-semibold text-red-600 mt-1">{error}</p> : hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
  </div>
);

const initialForm = (expense, members, defaultDate) => ({
  description: expense?.description ?? '',
  amount: expense ? String(paiseToRupees(expense.amountPaise)) : '',
  category: expense?.category ?? 'food',
  date: expense?.date ?? defaultDate,
  paidBy: expense?.paidBy ?? members[0]?.id ?? '',
  mode: expense?.split?.mode ?? 'equal',
  included: new Set(expense?.split?.mode === 'equal' ? expense.split.members : members.map((m) => m.id)),
  exact: Object.fromEntries((expense?.split?.mode === 'exact' ? expense.split.shares : []).map((s) => [s.memberId, String(paiseToRupees(s.amountPaise))])),
  note: expense?.note ?? '',
});

/**
 * Part 15 — add or change an expense: what, how much (₹, up to 2 decimals), type, date, who paid,
 * and how it is split (equally between some people, or exact amounts). Same rules as the server.
 */
export const ExpenseDialog = ({ expense = null, members, defaultDate, onSubmit, onClose }) => {
  const id = useId();
  const [form, setForm] = useState(() => initialForm(expense, members, defaultDate));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const amountPaise = form.amount.trim() ? toPaise(form.amount) : NaN;
  const includedIds = members.filter((m) => form.included.has(m.id)).map((m) => m.id);
  const each = Number.isFinite(amountPaise) && amountPaise > 0 && includedIds.length ? splitEvenly(amountPaise, includedIds) : null;
  const assigned = members.reduce((sum, m) => sum + (form.exact[m.id]?.trim() ? toPaise(form.exact[m.id]) : 0), 0);
  const left = Number.isFinite(amountPaise) && Number.isFinite(assigned) ? amountPaise - assigned : null;

  const toggle = (memberId) =>
    setForm((f) => {
      const included = new Set(f.included);
      if (included.has(memberId)) included.delete(memberId);
      else included.add(memberId);
      return { ...f, included };
    });

  const submit = async (e) => {
    e.preventDefault();
    const body = {
      description: form.description,
      amountPaise: form.amount.trim() ? toPaise(form.amount) : undefined,
      category: form.category,
      date: form.date,
      paidBy: form.paidBy,
      split:
        form.mode === 'equal'
          ? { mode: 'equal', members: includedIds }
          : {
              mode: 'exact',
              shares: members.filter((m) => form.exact[m.id]?.trim()).map((m) => ({ memberId: m.id, amountPaise: toPaise(form.exact[m.id]) })),
            },
      ...(form.note.trim() && { note: form.note.trim() }),
    };
    const checked = validate(ExpenseInputSchema, body);
    if (!checked.success) {
      setErrors(checked.fields);
      return;
    }
    setBusy(true);
    const result = await onSubmit(checked.data);
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
        className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4"
        data-testid="expense-dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 id={`${id}-title`} className="text-lg font-bold text-slate-900">
            {expense ? 'Change expense' : 'Add an expense'}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <Field id={`${id}-desc`} label="What was it for? *" error={errors.description}>
          <input id={`${id}-desc`} autoFocus value={form.description} onChange={set('description')} maxLength={120} placeholder="e.g. Dinner at Chopsticks" className={inputClass(errors.description)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id={`${id}-amount`} label="Amount (₹) *" error={errors.amountPaise}>
            <input id={`${id}-amount`} inputMode="decimal" value={form.amount} onChange={set('amount')} placeholder="0" className={inputClass(errors.amountPaise)} />
          </Field>
          <Field id={`${id}-date`} label="Date *" error={errors.date}>
            <input id={`${id}-date`} type="date" value={form.date} onChange={set('date')} className={inputClass(errors.date)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field id={`${id}-category`} label="Type" error={errors.category}>
            <select id={`${id}-category`} value={form.category} onChange={set('category')} className={inputClass(errors.category)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id={`${id}-paid`} label="Paid by" error={errors.paidBy}>
            <select id={`${id}-paid`} value={form.paidBy} onChange={set('paidBy')} className={inputClass(errors.paidBy)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">Split between</legend>
          <div className="flex rounded-lg border border-slate-200 p-0.5 w-fit" role="radiogroup" aria-label="How to split">
            {[
              { value: 'equal', label: 'Equally' },
              { value: 'exact', label: 'Exact amounts' },
            ].map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={form.mode === m.value}
                onClick={() => setForm((f) => ({ ...f, mode: m.value }))}
                className={`px-3 py-1 rounded-md text-xs font-semibold ${form.mode === m.value ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {form.mode === 'equal' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {members.map((m) => (
                <label key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm cursor-pointer hover:bg-slate-50">
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={form.included.has(m.id)} onChange={() => toggle(m.id)} className="w-4 h-4 accent-blue-600" />
                    {m.name}
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums">{each?.has(m.id) ? formatPaise(each.get(m.id)) : ''}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {members.map((m) => (
                <label key={m.id} className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl border border-slate-200 text-sm">
                  <span>{m.name}</span>
                  <input
                    inputMode="decimal"
                    aria-label={`${m.name}'s share (₹)`}
                    value={form.exact[m.id] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, exact: { ...f.exact, [m.id]: e.target.value } }))}
                    placeholder="0"
                    className="w-28 px-2 py-1 rounded-lg border border-slate-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
              ))}
              {left !== null && (
                <p className={`text-[11px] font-semibold ${left === 0 ? 'text-emerald-700' : 'text-amber-800'}`} data-testid="split-left">
                  {left === 0 ? 'Adds up to the amount.' : left > 0 ? `${formatPaise(left)} still to share out.` : `${formatPaise(-left)} too much.`}
                </p>
              )}
            </div>
          )}
          {errors.split && <p className="text-[11px] font-semibold text-red-600">{errors.split}</p>}
        </fieldset>

        <Field id={`${id}-note`} label="Note" error={errors.note}>
          <input id={`${id}-note`} value={form.note} onChange={set('note')} maxLength={300} placeholder="Optional, e.g. paid by card" className={inputClass(errors.note)} />
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
          <button
            type="submit"
            disabled={busy}
            className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {expense ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {busy ? 'Saving...' : expense ? 'Save' : 'Add expense'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExpenseDialog;
