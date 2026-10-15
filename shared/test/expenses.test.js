import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ExpenseInputSchema,
  SettlementInputSchema,
  TripMembersSchema,
  buildLedger,
  computeBalances,
  expenseSummary,
  expensesToCsv,
  formatPaise,
  paiseToRupees,
  sharesOf,
  splitEvenly,
  suggestSettlements,
  toPaise,
  validate,
} from '../src/index.js';

const people = [
  { id: 'm1', name: 'Neha' },
  { id: 'm2', name: 'Aman' },
  { id: 'm3', name: 'Priya' },
];
const expense = (amountPaise, paidBy, split, extra = {}) => ({ kind: 'expense', description: 'x', category: 'food', date: '2026-12-01', amountPaise, paidBy, split, ...extra });
const equal = (...members) => ({ mode: 'equal', members });
const balanceOf = (balances, id) => balances.find((b) => b.memberId === id).balancePaise;

test('money in paise: typed rupees, display, even split never loses a paisa', () => {
  assert.equal(toPaise('1,234.5'), 123450);
  assert.equal(toPaise('₹99'), 9900);
  assert.equal(toPaise(0.1 + 0.2), 30, 'no floating point surprises');
  assert.ok(Number.isNaN(toPaise('abc')));
  assert.ok(Number.isNaN(toPaise('')));
  assert.equal(paiseToRupees(123450), 1234.5);
  assert.equal(formatPaise(123450), '₹1,234.50');
  assert.equal(formatPaise(10000000), '₹1,00,000');
  assert.equal(formatPaise(-5005), '-₹50.05');
  assert.deepEqual([...splitEvenly(10000, ['a', 'b', 'c'])], [['a', 3334], ['b', 3333], ['c', 3333]]);
  assert.deepEqual([...sharesOf(expense(900, 'm1', { mode: 'exact', shares: [{ memberId: 'm1', amountPaise: 0 }, { memberId: 'm2', amountPaise: 900 }] }))], [['m2', 900]]);
});

test('balances: who paid, who spent, settlements; they always add up to zero', () => {
  const expenses = [
    expense(300000, 'm1', equal('m1', 'm2', 'm3')), // Neha paid ₹3,000 for all three
    expense(90000, 'm2', equal('m2', 'm3')), // Aman paid ₹900 for Aman + Priya
    expense(50000, 'm3', { mode: 'exact', shares: [{ memberId: 'm1', amountPaise: 20000 }, { memberId: 'm3', amountPaise: 30000 }] }),
  ];
  const balances = computeBalances(people, expenses);
  const neha = balances.find((b) => b.memberId === 'm1');
  assert.deepEqual([neha.paidPaise, neha.spentPaise, neha.balancePaise], [300000, 120000, 180000]);
  assert.equal(balanceOf(balances, 'm2'), 90000 - 100000 - 45000);
  assert.equal(balanceOf(balances, 'm3'), 50000 - 100000 - 45000 - 30000);
  assert.equal(balances.reduce((t, b) => t + b.balancePaise, 0), 0);

  const payments = suggestSettlements(balances);
  assert.deepEqual(payments, [
    { from: 'm3', to: 'm1', amountPaise: 125000 },
    { from: 'm2', to: 'm1', amountPaise: 55000 },
  ]);
  // Record them as settlements → everyone is even, spending figures do not change.
  const settled = [...expenses, ...payments.map((p) => ({ kind: 'settlement', amountPaise: p.amountPaise, paidBy: p.from, date: '2026-12-02', split: { mode: 'exact', shares: [{ memberId: p.to, amountPaise: p.amountPaise }] } }))];
  const after = computeBalances(people, settled);
  assert.ok(after.every((b) => b.balancePaise === 0));
  assert.equal(after.find((b) => b.memberId === 'm1').spentPaise, 120000);
  assert.deepEqual(suggestSettlements(after), []);
});

test('settling a bigger group needs at most people − 1 payments', () => {
  const many = Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  const expenses = many.map((m, i) => expense((i + 1) * 12345, m.id, equal(...many.map((x) => x.id))));
  const payments = suggestSettlements(computeBalances(many, expenses));
  assert.ok(payments.length <= many.length - 1);
  const after = computeBalances(many, [
    ...expenses,
    ...payments.map((p) => ({ kind: 'settlement', amountPaise: p.amountPaise, paidBy: p.from, split: { mode: 'exact', shares: [{ memberId: p.to, amountPaise: p.amountPaise }] } })),
  ]);
  assert.ok(after.every((b) => b.balancePaise === 0));
});

test('summary: per type, estimate vs actual per part of the plan, outside the plan, budget left, per day', () => {
  const itinerary = { totalBudget: 20000, estimatedTotal: 18000, budgetBreakdown: { accommodation: 7000, activitiesAndSightseeing: 3000, foodAndDining: 5000, localTransport: 3000 } };
  const expenses = [
    expense(700000, 'm1', equal('m1', 'm2'), { category: 'stay', date: '2026-12-01' }),
    expense(150000, 'm2', equal('m1', 'm2'), { category: 'food', date: '2026-12-01' }),
    expense(320000, 'm1', equal('m1', 'm2'), { category: 'travel', date: '2026-11-30' }),
    { kind: 'settlement', amountPaise: 99999, paidBy: 'm2', date: '2026-12-02', split: { mode: 'exact', shares: [{ memberId: 'm1', amountPaise: 99999 }] } },
  ];
  const s = expenseSummary(expenses, itinerary);
  assert.equal(s.count, 3, 'settlements are not spending');
  assert.equal(s.totalPaise, 1170000);
  assert.deepEqual(s.vsPlan.find((v) => v.key === 'accommodation'), { key: 'accommodation', label: 'Accommodation & Stays', estimatePaise: 700000, actualPaise: 700000 });
  assert.equal(s.vsPlan.find((v) => v.key === 'foodAndDining').actualPaise, 150000);
  assert.equal(s.outsidePlanPaise, 320000);
  assert.equal(s.leftPaise, 2000000 - 1170000);
  assert.deepEqual(s.byDate.map((d) => d.date), ['2026-11-30', '2026-12-01']);
  assert.equal(s.byCategory.find((c) => c.category === 'travel').amountPaise, 320000);
  const ledger = buildLedger(people.slice(0, 2), expenses, itinerary);
  assert.equal(ledger.settlements.length, 1);
});

test('forms: amounts, splits that do not add up, same person twice, settlements, member names', () => {
  const ok = validate(ExpenseInputSchema, { description: ' Dinner ', amountPaise: 150000, category: 'food', date: '2026-12-01', paidBy: 'm1', split: equal('m1', 'm2') });
  assert.equal(ok.success, true);
  assert.equal(ok.data.description, 'Dinner');
  const missing = validate(ExpenseInputSchema, { description: '', category: 'food', date: '2026-12-01', paidBy: 'm1', split: equal('m1') });
  assert.equal(missing.fields.description, 'What it was for is required.');
  assert.equal(missing.fields.amountPaise, 'Amount is required.');
  assert.equal(validate(ExpenseInputSchema, { description: 'a', amountPaise: 0, category: 'food', date: '2026-12-01', paidBy: 'm1', split: equal('m1') }).fields.amountPaise, 'Amount must be more than ₹0.');
  const badSum = validate(ExpenseInputSchema, {
    description: 'Cab',
    amountPaise: 100000,
    category: 'transport',
    date: '2026-12-01',
    paidBy: 'm1',
    split: { mode: 'exact', shares: [{ memberId: 'm1', amountPaise: 40000 }, { memberId: 'm2', amountPaise: 50000 }] },
  });
  assert.equal(badSum.fields.split, 'The shares add up to ₹900, but the amount is ₹1,000.');
  assert.equal(validate(ExpenseInputSchema, { description: 'a', amountPaise: 100, category: 'food', date: '2026-12-01', paidBy: 'm1', split: equal('m1', 'm1') }).fields.split, 'A person is listed twice in the split.');
  assert.equal(validate(ExpenseInputSchema, { description: 'a', amountPaise: 100, category: 'pets', date: '2026-12-01', paidBy: 'm1', split: equal('m1') }).fields.category, 'Please pick a type.');
  assert.equal(validate(SettlementInputSchema, { from: 'm1', to: 'm1', amountPaise: 100, date: '2026-12-01' }).fields.to, 'Pick two different people.');
  assert.equal(validate(TripMembersSchema, { members: [{ name: 'Neha' }, { name: 'neha ' }] }).fields['members.1.name'], '"neha" is in the list twice.');
  assert.equal(validate(TripMembersSchema, { members: [] }).fields.members, 'A trip needs at least one person.');
});

test('CSV export: one row per expense, plain amounts, quotes escaped, Excel-friendly', () => {
  const csv = expensesToCsv(people, [
    expense(123456, 'm1', equal('m1', 'm2'), { description: 'Dinner, "the good one"', date: '2026-12-02', note: 'Paid by card' }),
    expense(5000, 'm2', equal('m3'), { description: 'Chai', category: 'food', date: '2026-12-01' }),
    { kind: 'settlement', amountPaise: 2500, paidBy: 'm3', date: '2026-12-03', split: { mode: 'exact', shares: [{ memberId: 'm2', amountPaise: 2500 }] } },
  ]);
  const lines = csv.replace('﻿', '').trim().split('\r\n');
  assert.equal(lines[0], 'Date,Description,Type,Amount (INR),Paid by,Split between,Note');
  assert.equal(lines[1], '2026-12-01,Chai,Food & drinks,50.00,Aman,Priya ₹50,');
  assert.equal(lines[2], '2026-12-02,"Dinner, ""the good one""",Food & drinks,1234.56,Neha,Neha ₹617.28; Aman ₹617.28,Paid by card');
  assert.equal(lines[3], '2026-12-03,Priya paid back Aman,Settlement,25.00,Priya,Aman ₹25,');
  assert.ok(csv.startsWith('﻿'), 'BOM so Excel reads ₹ correctly');
});
