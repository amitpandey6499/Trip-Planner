import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bed,
  Car,
  CheckCircle2,
  Download,
  HandCoins,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Receipt,
  ShoppingBag,
  Ticket,
  TrainFront,
  Trash2,
  Users,
  Utensils,
  Wallet,
} from 'lucide-react';
import { EXPENSE_CATEGORIES, expensesToCsv, formatDate, formatPaise, sharesOf, todayIso } from '@tripplanner/shared';
import { useTrip } from '../../context/TripContext';
import { useExpenses } from '../../hooks/useExpenses';
import { exportFileName, saveText } from '../../utils/download';
import ExpenseDialog from './ExpenseDialog';
import PeopleDialog from './PeopleDialog';
import SpendingVsPlan, { BudgetMeter } from './SpendingVsPlan';

const ICONS = { stay: Bed, food: Utensils, transport: Car, activities: Ticket, travel: TrainFront, shopping: ShoppingBag, other: Receipt };
const LABELS = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.value, c.label]));

const card = 'bg-white rounded-2xl p-5 border border-slate-100 shadow-soft';

/** The body an expense was made from (for "Undo" after a delete). */
const bodyOf = (e) => ({
  description: e.description,
  amountPaise: e.amountPaise,
  category: e.category,
  date: e.date,
  paidBy: e.paidBy,
  split: e.split.mode === 'equal' ? { mode: 'equal', members: e.split.members } : { mode: 'exact', shares: e.split.shares },
  ...(e.note && { note: e.note }),
});

/**
 * Part 15 — the Expenses tab of a saved trip: what was spent (vs the plan and the budget), who paid,
 * who owes whom and the fewest payments to settle up. Private: never on the share page or in the PDF.
 */
export const ExpensesPanel = ({ tripId, itinerary }) => {
  const { showToast } = useTrip();
  const book = useExpenses(tripId);
  const [dialog, setDialog] = useState(null); // { kind: 'expense', expense? } | { kind: 'people' }
  const [problem, setProblem] = useState(null);
  const [busy, setBusy] = useState(null);

  if (book.loading && !book.ledger) {
    return (
      <div className={`${card} flex items-center gap-2 text-sm text-slate-500`}>
        <Loader2 className="w-4 h-4 animate-spin" /> Loading expenses...
      </div>
    );
  }
  if (!book.ledger) {
    return (
      <div className={`${card} space-y-2`} role="alert">
        <p className="text-sm text-red-700">{book.error}</p>
        <button type="button" onClick={book.reload} className="text-xs font-semibold text-blue-700 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  const { members, expenses, balances, settlements, summary } = book.ledger;
  const nameOf = (id) => members.find((m) => m.id === id)?.name ?? 'Someone';
  const today = todayIso();
  const defaultDate = !itinerary.endDate || today <= itinerary.endDate ? today : itinerary.startDate;
  const estimateDiff = summary.estimatePaise - summary.totalPaise;
  const allEven = expenses.length > 0 && settlements.length === 0;

  const after = (result, message, undo) => {
    if (!result.ok) {
      setProblem(result.error);
      return false;
    }
    setProblem(null);
    showToast(message, undo ? { label: 'Undo', onClick: undo } : null);
    return true;
  };

  const saveExpense = async (body) => {
    const editing = dialog.expense;
    const result = editing ? await book.update(editing.id, body) : await book.add(body);
    if (result.ok) {
      setDialog(null);
      after(result, editing ? `Changed ${body.description}` : `Added ${body.description} (${formatPaise(body.amountPaise)})`);
    }
    return result;
  };

  const remove = async (e) => {
    setBusy(e.id);
    const result = await book.remove(e.id);
    setBusy(null);
    if (e.kind === 'settlement') {
      const to = e.split.shares[0].memberId;
      after(result, `Removed: ${nameOf(e.paidBy)} paid ${nameOf(to)} back`, () => book.settle({ from: e.paidBy, to, amountPaise: e.amountPaise, date: e.date }));
    } else {
      after(result, `Deleted ${e.description}`, () => book.add(bodyOf(e)));
    }
  };

  const markPaid = async (payment) => {
    setBusy(`${payment.from}>${payment.to}`);
    const result = await book.settle({ ...payment, date: today });
    setBusy(null);
    const recorded = result.ok
      ? result.ledger.expenses.find((e) => e.kind === 'settlement' && e.paidBy === payment.from && e.split.shares[0]?.memberId === payment.to && e.amountPaise === payment.amountPaise)
      : null;
    after(result, `Recorded: ${nameOf(payment.from)} paid ${nameOf(payment.to)} ${formatPaise(payment.amountPaise)}`, recorded ? () => book.remove(recorded.id) : null);
  };

  const saveMembers = async (list) => {
    const result = await book.setMembers(list);
    if (result.ok) {
      setDialog(null);
      after(result, 'People updated');
    }
    return result;
  };

  // newest date first, one group per day
  const groups = [];
  for (const e of expenses) {
    const last = groups.at(-1);
    if (last?.date === e.date) last.items.push(e);
    else groups.push({ date: e.date, items: [e] });
  }

  return (
    <div className="space-y-6" data-testid="expenses-panel">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" /> Expenses
          </h3>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" /> Only you see these — they are never on the share page or in the PDF.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <button
            type="button"
            onClick={() => saveText(expensesToCsv(members, expenses), exportFileName(`${itinerary.title} expenses`, 'csv'), 'text/csv;charset=utf-8')}
            disabled={!expenses.length}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-500" /> Spreadsheet (.csv)
          </button>
          <button
            type="button"
            onClick={() => setDialog({ kind: 'expense' })}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" /> Add expense
          </button>
        </div>
      </div>

      {problem && (
        <p className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700" role="alert">
          {problem}
        </p>
      )}

      {/* headline numbers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={card}>
          <p className="text-xs text-slate-500">Spent so far</p>
          <p className="text-3xl font-extrabold text-slate-900" data-testid="spent-total">
            {formatPaise(summary.totalPaise)}
          </p>
          <p className="text-[11px] text-slate-500">
            {summary.count} {summary.count === 1 ? 'expense' : 'expenses'} • {members.length} {members.length === 1 ? 'person' : 'people'}
          </p>
        </div>
        <div className={`${card} space-y-2`}>
          <p className="text-xs text-slate-500">Your budget</p>
          <p className="text-xl font-bold text-slate-900">{summary.budgetPaise ? formatPaise(summary.budgetPaise) : 'Not set'}</p>
          <BudgetMeter spentPaise={summary.totalPaise} budgetPaise={summary.budgetPaise} />
        </div>
        <div className={card}>
          <p className="text-xs text-slate-500">The plan&apos;s estimate</p>
          <p className="text-xl font-bold text-slate-900">{formatPaise(summary.estimatePaise)}</p>
          <p className={`text-[11px] font-semibold flex items-center gap-1 ${estimateDiff < 0 ? 'text-amber-800' : 'text-slate-600'}`}>
            {estimateDiff < 0 && <AlertTriangle className="w-3.5 h-3.5" />}
            {estimateDiff < 0 ? `${formatPaise(-estimateDiff)} more than estimated` : `${formatPaise(estimateDiff)} of the estimate not spent yet`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-3">
          <SpendingVsPlan summary={summary} />
        </div>

        {/* people, balances, settle up */}
        <section className={`${card} lg:col-span-2 space-y-4`} aria-labelledby="balances-title">
          <div className="flex items-center justify-between gap-2">
            <h3 id="balances-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" /> Who paid, who owes
            </h3>
            <button type="button" onClick={() => setDialog({ kind: 'people' })} className="text-xs font-semibold text-blue-700 hover:underline no-print">
              Edit people
            </button>
          </div>
          <ul className="space-y-2" data-testid="balances">
            {balances.map((b) => (
              <li key={b.memberId} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="font-semibold text-slate-800">{b.name}</span>
                  <span className="block text-[11px] text-slate-500 tabular-nums">
                    paid {formatPaise(b.paidPaise)} • share {formatPaise(b.spentPaise)}
                  </span>
                </span>
                <span
                  className={`text-xs font-bold whitespace-nowrap tabular-nums ${b.balancePaise > 0 ? 'text-emerald-700' : b.balancePaise < 0 ? 'text-amber-800' : 'text-slate-500'}`}
                >
                  {b.balancePaise > 0 ? `gets back ${formatPaise(b.balancePaise)}` : b.balancePaise < 0 ? `owes ${formatPaise(-b.balancePaise)}` : 'even'}
                </span>
              </li>
            ))}
          </ul>

          <div className="pt-3 border-t border-slate-100 space-y-2" data-testid="settle-up">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <HandCoins className="w-3.5 h-3.5" /> Settle up
            </p>
            {settlements.length ? (
              settlements.map((p) => (
                <div key={`${p.from}>${p.to}`} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-sm text-slate-800 flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className="font-semibold">{nameOf(p.from)}</span> <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold">{nameOf(p.to)}</span>
                    <span className="font-bold tabular-nums">{formatPaise(p.amountPaise)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => markPaid(p)}
                    disabled={busy === `${p.from}>${p.to}`}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-[11px] font-semibold text-slate-700 whitespace-nowrap disabled:opacity-60 no-print"
                  >
                    Mark as paid
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600 flex items-center gap-1.5">
                {allEven ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Everyone is even.
                  </>
                ) : (
                  'Add expenses to see who owes whom.'
                )}
              </p>
            )}
            {settlements.length > 1 && <p className="text-[11px] text-slate-500">The fewest payments that make everyone even.</p>}
          </div>
        </section>
      </div>

      {/* the list */}
      <section className={`${card} space-y-4`} aria-label="All expenses">
        {groups.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-600">No expenses yet. Add the first one — the train tickets, a hotel advance, a dinner.</p>
            <button type="button" onClick={() => setDialog({ kind: 'expense' })} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
              <Plus className="w-4 h-4" /> Add expense
            </button>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.date}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">{formatDate(g.date)}</p>
              <ul className="divide-y divide-slate-100" data-testid="expense-list">
                {g.items.map((e) => {
                  const settlement = e.kind === 'settlement';
                  const Icon = settlement ? HandCoins : (ICONS[e.category] ?? Receipt);
                  const shares = sharesOf(e);
                  const splitText = settlement
                    ? `${nameOf(e.paidBy)} paid ${nameOf(e.split.shares[0]?.memberId)} back`
                    : `Paid by ${nameOf(e.paidBy)} • ${e.split.mode === 'equal' ? (shares.size === members.length ? 'split equally' : `split between ${[...shares.keys()].map(nameOf).join(', ')}`) : 'exact amounts'}`;
                  return (
                    <li key={e.id} className="py-2.5 flex items-center gap-3" data-testid="expense-row">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${settlement ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-800 truncate">{settlement ? 'Paid back' : e.description}</span>
                        <span className="block text-[11px] text-slate-500 truncate">
                          {settlement ? splitText : `${LABELS[e.category] ?? 'Other'} • ${splitText}`}
                          {e.note ? ` • ${e.note}` : ''}
                        </span>
                      </span>
                      <span className={`text-sm font-bold tabular-nums ${settlement ? 'text-emerald-700' : 'text-slate-900'}`}>{formatPaise(e.amountPaise)}</span>
                      <span className="flex items-center gap-1 no-print">
                        {!settlement && (
                          <button
                            type="button"
                            onClick={() => setDialog({ kind: 'expense', expense: e })}
                            aria-label={`Change ${e.description}`}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => remove(e)}
                          disabled={busy === e.id}
                          aria-label={settlement ? 'Remove this payment back' : `Delete ${e.description}`}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-300 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </section>

      {dialog?.kind === 'expense' && (
        <ExpenseDialog key={dialog.expense?.id ?? 'new'} expense={dialog.expense ?? null} members={members} defaultDate={defaultDate} onSubmit={saveExpense} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'people' && <PeopleDialog members={members} onSubmit={saveMembers} onClose={() => setDialog(null)} />}
    </div>
  );
};

export default ExpensesPanel;
