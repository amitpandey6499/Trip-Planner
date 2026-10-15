import { BUDGET_BUCKETS, EXPENSE_CATEGORIES } from '../constants.js';
import { formatPaise, splitEvenly } from './money.js';

/**
 * Part 15 — who paid, who owes, and how to settle up. Pure functions (server answers with them, tests check them).
 * expense = { id, kind: 'expense' | 'settlement', description, amountPaise, category, date, paidBy, split, note }
 * A settlement is "from paid to back": kind 'settlement', paidBy = from, split = { mode: 'exact', shares: [{ memberId: to, amountPaise }] }.
 */

const isSettlement = (e) => e.kind === 'settlement';

/** What each person owes for one expense: Map(memberId → paise). Always adds up to the amount. */
export const sharesOf = (expense) => {
  if (expense.split?.mode === 'exact') {
    return new Map(expense.split.shares.filter((s) => s.amountPaise > 0).map((s) => [s.memberId, s.amountPaise]));
  }
  return splitEvenly(expense.amountPaise, expense.split?.members ?? []);
};

/**
 * Per person: paid (for real expenses), spent (their share), settled (paid back − received back), balance.
 * balance > 0 → the others owe them; < 0 → they owe. The balances of a trip always add up to 0.
 */
export const computeBalances = (members, expenses) => {
  const rows = new Map(members.map((m) => [m.id, { memberId: m.id, name: m.name, paidPaise: 0, spentPaise: 0, settledPaise: 0, balancePaise: 0 }]));
  for (const e of expenses) {
    const payer = rows.get(e.paidBy);
    for (const [id, amount] of sharesOf(e)) {
      const row = rows.get(id);
      if (!payer || !row) continue; // a person who was removed: ignored (the server does not allow it)
      if (isSettlement(e)) {
        payer.settledPaise += amount;
        row.settledPaise -= amount;
      } else {
        payer.paidPaise += amount;
        row.spentPaise += amount;
      }
    }
  }
  for (const row of rows.values()) row.balancePaise = row.paidPaise - row.spentPaise + row.settledPaise;
  return [...rows.values()];
};

/**
 * Fewest payments to make everyone even: the biggest debt is paid to the biggest credit first
 * (at most people − 1 payments). → [{ from, to, amountPaise }]
 */
export const suggestSettlements = (balances) => {
  const order = (a, b) => b.amount - a.amount || String(a.id).localeCompare(String(b.id));
  const debtors = balances.filter((b) => b.balancePaise < 0).map((b) => ({ id: b.memberId, amount: -b.balancePaise })).sort(order);
  const creditors = balances.filter((b) => b.balancePaise > 0).map((b) => ({ id: b.memberId, amount: b.balancePaise })).sort(order);
  const payments = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    payments.push({ from: debtors[i].id, to: creditors[j].id, amountPaise: amount });
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount === 0) i += 1;
    if (creditors[j].amount === 0) j += 1;
  }
  return payments;
};

/**
 * Spending vs the plan: totals per type, the plan's four estimate parts next to what was really spent,
 * spending outside the estimate (travel to the destination, shopping...), budget left, spending per day.
 * Estimates in the itinerary are whole rupees → converted to paise here.
 */
export const expenseSummary = (expenses, itinerary = null) => {
  const real = expenses.filter((e) => !isSettlement(e));
  const sumWhere = (test) => real.filter(test).reduce((total, e) => total + e.amountPaise, 0);
  const totalPaise = sumWhere(() => true);
  const byCategory = EXPENSE_CATEGORIES.map((c) => ({ category: c.value, label: c.label, amountPaise: sumWhere((e) => e.category === c.value) }));
  const bucketOf = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.value, c.bucket]));
  const vsPlan = BUDGET_BUCKETS.map((b) => ({
    key: b.key,
    label: b.label,
    estimatePaise: Math.round((itinerary?.budgetBreakdown?.[b.key] ?? 0) * 100),
    actualPaise: sumWhere((e) => bucketOf[e.category] === b.key),
  }));
  const byDate = new Map();
  for (const e of real) byDate.set(e.date, (byDate.get(e.date) ?? 0) + e.amountPaise);
  const budgetPaise = Math.round((itinerary?.totalBudget ?? 0) * 100);
  return {
    count: real.length,
    totalPaise,
    byCategory,
    vsPlan,
    outsidePlanPaise: sumWhere((e) => !bucketOf[e.category]),
    estimatePaise: Math.round((itinerary?.estimatedTotal ?? 0) * 100),
    budgetPaise,
    leftPaise: budgetPaise - totalPaise,
    byDate: [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, amountPaise]) => ({ date, amountPaise })),
  };
};

/** Everything the Expenses tab shows, in one object (the API answers with this after every change). */
export const buildLedger = (members, expenses, itinerary = null) => {
  const balances = computeBalances(members, expenses);
  return { members, expenses, balances, settlements: suggestSettlements(balances), summary: expenseSummary(expenses, itinerary) };
};

const csvCell = (value) => {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Spreadsheet export (Excel / Google Sheets): one row per expense; amounts as plain numbers (rupees, 2 decimals). */
export const expensesToCsv = (members, expenses) => {
  const name = (id) => members.find((m) => m.id === id)?.name ?? '(removed)';
  const category = (value) => EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value ?? '';
  const rupees = (paise) => (paise / 100).toFixed(2);
  const rows = [['Date', 'Description', 'Type', 'Amount (INR)', 'Paid by', 'Split between', 'Note']];
  for (const e of [...expenses].sort((a, b) => String(a.date).localeCompare(String(b.date)))) {
    const split = [...sharesOf(e)].map(([id, p]) => `${name(id)} ${formatPaise(p)}`).join('; ');
    rows.push(
      isSettlement(e)
        ? [e.date, `${name(e.paidBy)} paid back ${name(e.split?.shares?.[0]?.memberId)}`, 'Settlement', rupees(e.amountPaise), name(e.paidBy), split, e.note ?? '']
        : [e.date, e.description, category(e.category), rupees(e.amountPaise), name(e.paidBy), split, e.note ?? ''],
    );
  }
  return `\uFEFF${rows.map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;
};
