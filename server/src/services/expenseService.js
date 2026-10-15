import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { LIMITS, buildLedger } from '@tripplanner/shared';
import { Expense, Trip, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Part 15 — the trip's expenses, its people and settling up. Every query includes the owner,
 * so nobody can read or change another user's expenses. Every change answers with the whole ledger
 * (shared buildLedger: balances, suggested payments, spending vs the plan).
 */

const findOwned = (tripId, ownerId) => (mongoose.isValidObjectId(tripId) ? Trip.findOne({ _id: tripId, owner: ownerId }) : null);

const newMemberId = (taken) => {
  let id;
  do id = `m-${crypto.randomBytes(3).toString('hex')}`;
  while (taken.has(id));
  taken.add(id);
  return id;
};

/** First time: the owner (first name) + "Traveller 2", "Traveller 3"... for the trip's number of travellers. */
const defaultMembers = async (trip, ownerId) => {
  const user = await User.findById(ownerId).select('name').lean();
  const first = String(user?.name ?? '').trim().split(/\s+/)[0] || 'Me';
  const count = Math.min(Math.max(1, trip.travelersCount || 1), LIMITS.MAX_TRIP_MEMBERS);
  const taken = new Set();
  return Array.from({ length: count }, (_, i) => ({ id: newMemberId(taken), name: i === 0 ? first : `Traveller ${i + 1}` }));
};

const loadTrip = async (tripId, ownerId) => {
  const trip = await findOwned(tripId, ownerId);
  if (!trip) throw ApiError.notFound('Trip not found.');
  if (trip.members?.length) return trip;
  // First visit: write the default people only if the list is still empty — two requests at the same time
  // (two tabs, a double render) then agree on ONE list instead of one of them failing.
  await Trip.updateOne(
    { _id: trip._id, owner: ownerId, $or: [{ members: { $exists: false } }, { members: { $size: 0 } }] },
    { $set: { members: await defaultMembers(trip, ownerId) } },
    { timestamps: false }, // people are not a change of the plan
  );
  return findOwned(tripId, ownerId);
};

const ledgerFor = async (trip) => {
  const expenses = await Expense.find({ trip: trip._id, owner: trip.owner }).sort({ date: -1, createdAt: -1 });
  const members = trip.members.map((m) => ({ id: m.id, name: m.name }));
  return buildLedger(members, expenses.map((e) => e.toJSON()), trip.itinerary);
};

const splitIds = (split) => (split.mode === 'equal' ? split.members : split.shares.map((s) => s.memberId));

const checkPeople = (trip, ids, field = 'paidBy') => {
  const known = new Set(trip.members.map((m) => m.id));
  if (ids.some((id) => !known.has(id))) {
    throw ApiError.badRequest('One of these people is not part of this trip any more. Reload the page and try again.', { field });
  }
};

const expenseFields = (input) => ({
  kind: 'expense',
  description: input.description,
  amountPaise: input.amountPaise,
  category: input.category,
  date: input.date,
  paidBy: input.paidBy,
  split: input.split.mode === 'equal' ? { mode: 'equal', members: input.split.members } : { mode: 'exact', shares: input.split.shares.filter((s) => s.amountPaise > 0) },
  note: input.note || undefined,
});

const findExpense = async (trip, expenseId) => {
  const expense = mongoose.isValidObjectId(expenseId) ? await Expense.findOne({ _id: expenseId, trip: trip._id, owner: trip.owner }) : null;
  if (!expense) throw ApiError.notFound('Expense not found.');
  return expense;
};

const ensureRoom = async (trip) => {
  const count = await Expense.countDocuments({ trip: trip._id, owner: trip.owner });
  if (count >= LIMITS.MAX_EXPENSES_PER_TRIP) throw ApiError.badRequest(`A trip can have at most ${LIMITS.MAX_EXPENSES_PER_TRIP} expenses.`);
};

export const getLedger = async (tripId, ownerId) => ledgerFor(await loadTrip(tripId, ownerId));

export const addExpense = async (tripId, ownerId, input) => {
  const trip = await loadTrip(tripId, ownerId);
  checkPeople(trip, [input.paidBy]);
  checkPeople(trip, splitIds(input.split), 'split');
  await ensureRoom(trip);
  await Expense.create({ trip: trip._id, owner: trip.owner, ...expenseFields(input) });
  return ledgerFor(trip);
};

export const updateExpense = async (tripId, ownerId, expenseId, input) => {
  const trip = await loadTrip(tripId, ownerId);
  const expense = await findExpense(trip, expenseId);
  if (expense.kind === 'settlement') throw ApiError.badRequest('A payment back can not be edited. Delete it and record it again.');
  checkPeople(trip, [input.paidBy]);
  checkPeople(trip, splitIds(input.split), 'split');
  expense.set(expenseFields(input));
  await expense.save();
  return ledgerFor(trip);
};

/** Deletes an expense, or a recorded payment back ("undo mark as paid"). */
export const deleteExpense = async (tripId, ownerId, expenseId) => {
  const trip = await loadTrip(tripId, ownerId);
  const expense = await findExpense(trip, expenseId);
  await expense.deleteOne();
  return ledgerFor(trip);
};

/** "Aman paid Neha back ₹450" → their balances move towards zero. */
export const addSettlement = async (tripId, ownerId, { from, to, amountPaise, date }) => {
  const trip = await loadTrip(tripId, ownerId);
  checkPeople(trip, [from, to], 'from');
  await ensureRoom(trip);
  await Expense.create({
    trip: trip._id,
    owner: trip.owner,
    kind: 'settlement',
    description: 'Paid back',
    amountPaise,
    category: null,
    date,
    paidBy: from,
    split: { mode: 'exact', shares: [{ memberId: to, amountPaise }] },
  });
  return ledgerFor(trip);
};

/** The whole list of people: renamed, added (new id), removed (only when they are in no expense). */
export const setMembers = async (tripId, ownerId, { members }) => {
  const trip = await loadTrip(tripId, ownerId);
  const existing = new Map(trip.members.map((m) => [m.id, m]));
  const taken = new Set(existing.keys());
  const next = members.map((m) => ({ id: m.id && existing.has(m.id) ? m.id : newMemberId(taken), name: m.name }));
  const kept = new Set(next.map((m) => m.id));
  for (const removed of trip.members.filter((m) => !kept.has(m.id))) {
    const used = await Expense.countDocuments({
      trip: trip._id,
      owner: trip.owner,
      $or: [{ paidBy: removed.id }, { 'split.members': removed.id }, { 'split.shares.memberId': removed.id }],
    });
    if (used) {
      throw ApiError.conflict(`${removed.name} is in ${used} ${used === 1 ? 'expense' : 'expenses'}. Change or delete ${used === 1 ? 'it' : 'those'} first.`, { field: 'members' });
    }
  }
  trip.members = next;
  await trip.save({ timestamps: false });
  return ledgerFor(trip);
};
