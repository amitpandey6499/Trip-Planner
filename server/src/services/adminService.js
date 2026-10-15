import mongoose from 'mongoose';
import { addDays, todayIso } from '@tripplanner/shared';
import { config } from '../config/env.js';
import { AiCache, AiUsage, ContactMessage, Expense, GeoCache, Trip, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Part 17 — numbers for the admin dashboard. Only counts and totals: no trip plans, no expense details.
 * Days are counted in Indian time (IST, UTC+05:30), the app's home time zone.
 */

const IST_MS = 330 * 60 * 1000;
const istDay = (date) => new Date(new Date(date).getTime() + IST_MS).toISOString().slice(0, 10);
const istMidnight = (iso) => new Date(new Date(`${iso}T00:00:00Z`).getTime() - IST_MS);

/** [{ date, count }] for every day of the range (missing days = 0). */
const perDay = (dates, firstDay, days, weights = null) => {
  const counts = new Map();
  dates.forEach((date, i) => counts.set(date, (counts.get(date) ?? 0) + (weights ? weights[i] : 1)));
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(firstDay, i);
    return { date, count: counts.get(date) ?? 0 };
  });
};

const SOURCES = ['gemini', 'offline', 'sample'];

const countBy = (values) => {
  const map = new Map();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return map;
};

export const getStats = async ({ days }) => {
  const today = todayIso();
  const firstDay = addDays(today, -(days - 1));
  const since = istMidnight(firstDay);
  const realUsers = { isDemo: { $ne: true } };

  const [users, newUsers, trips, recentTrips, allDestinations, sharedTrips, expenses, expenseSum, messages, unread, usage, cachedPlans, geo] = await Promise.all([
    User.countDocuments(realUsers),
    User.find({ ...realUsers, createdAt: { $gte: since } }, 'createdAt').lean(),
    Trip.countDocuments({}),
    Trip.find({ createdAt: { $gte: since } }, 'createdAt').lean(),
    Trip.find({}, 'destination').lean(),
    Trip.countDocuments({ 'share.enabled': true }),
    Expense.countDocuments({ kind: 'expense' }),
    Expense.find({ kind: 'expense' }, 'amountPaise').lean(),
    ContactMessage.countDocuments({}),
    ContactMessage.countDocuments({ status: 'new' }),
    AiUsage.find({ day: { $gte: firstDay } }, 'day count user').lean(),
    AiCache.countDocuments({}),
    GeoCache.find({}, 'kind').lean(),
  ]);

  // Popular destinations: same place written differently ("goa", "Goa ") counts once.
  const names = new Map();
  for (const t of allDestinations) {
    const key = String(t.destination ?? '').trim().toLowerCase();
    if (!key) continue;
    const entry = names.get(key) ?? { destination: String(t.destination).trim(), trips: 0 };
    entry.trips += 1;
    names.set(key, entry);
  }
  const popular = [...names.values()].sort((a, b) => b.trips - a.trips || a.destination.localeCompare(b.destination)).slice(0, 8);

  // Who wrote the plans made in the range (a filter on the nested field works on every MongoDB-compatible database).
  const sourceCounts = await Promise.all(SOURCES.map((source) => Trip.countDocuments({ createdAt: { $gte: since }, 'itinerary.source': source })));
  const aiToday = usage.filter((u) => u.day === today);
  const geoKinds = countBy(geo.map((g) => g.kind));

  return {
    range: { days, from: firstDay, to: today },
    totals: {
      users,
      trips,
      sharedTrips,
      expenses,
      expensesPaise: expenseSum.reduce((sum, e) => sum + (e.amountPaise ?? 0), 0),
      messages,
      unreadMessages: unread,
    },
    newUsers: newUsers.length,
    newTrips: recentTrips.length,
    tripsPerDay: perDay(recentTrips.map((t) => istDay(t.createdAt)), firstDay, days),
    signupsPerDay: perDay(newUsers.map((u) => istDay(u.createdAt)), firstDay, days),
    popularDestinations: popular,
    planSources: SOURCES.map((source, i) => ({ source, trips: sourceCounts[i] })),
    ai: {
      enabled: Boolean(config.gemini.apiKey),
      model: config.gemini.apiKey ? config.gemini.model : null,
      dailyLimit: config.gemini.dailyLimit,
      callsToday: aiToday.reduce((sum, u) => sum + u.count, 0),
      usersToday: aiToday.length,
      callsInRange: usage.reduce((sum, u) => sum + u.count, 0),
      callsPerDay: perDay(usage.map((u) => u.day), firstDay, days, usage.map((u) => u.count)),
      cachedPlans,
    },
    cache: { places: geoKinds.get('place') ?? 0, routes: geoKinds.get('route') ?? 0, weather: geoKinds.get('weather') ?? 0 },
  };
};

/** Contact form messages, newest first. */
export const listMessages = async ({ status = 'all' } = {}) => {
  const filter = status === 'new' || status === 'read' ? { status } : {};
  const list = await ContactMessage.find(filter).sort({ createdAt: -1 }).limit(200);
  return list.map((m) => m.toJSON());
};

const findMessage = async (id) => {
  const message = mongoose.isValidObjectId(id) ? await ContactMessage.findById(id) : null;
  if (!message) throw ApiError.notFound('Message not found.');
  return message;
};

export const setMessageStatus = async (id, status) => {
  const message = await findMessage(id);
  message.status = status;
  await message.save();
  return message.toJSON();
};

export const deleteMessage = async (id) => {
  const message = await findMessage(id);
  await message.deleteOne();
};

/** Accounts (newest first, max 100) with their number of trips. Search by name or e-mail. */
export const listUsers = async ({ q = '' } = {}) => {
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = q ? { $or: [{ name: { $regex: escaped, $options: 'i' } }, { email: { $regex: escaped, $options: 'i' } }] } : {};
  const users = await User.find(filter, 'name email role isDemo createdAt lastLoginAt').sort({ createdAt: -1 }).limit(100).lean();
  const counts = await Trip.aggregate([{ $match: { owner: { $in: users.map((u) => u._id) } } }, { $group: { _id: '$owner', trips: { $sum: 1 } } }]);
  const tripsOf = new Map(counts.map((c) => [String(c._id), c.trips]));
  return users.map((u) => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: !u.isDemo && config.auth.adminEmails.includes(String(u.email).toLowerCase()) ? 'admin' : (u.role ?? 'user'),
    isDemo: Boolean(u.isDemo),
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt ?? null,
    trips: tripsOf.get(String(u._id)) ?? 0,
  }));
};
