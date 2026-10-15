import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { addDays, normalizeItinerary, todayIso } from '@tripplanner/shared';
import { Expense, Trip, User } from '../models/index.js';
import { createUserWithRandomPassword } from './authService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEMO_EMAIL = 'demo@tripplanner.com';

const loadManaliSample = () =>
  JSON.parse(fs.readFileSync(path.join(__dirname, '../data/sampleItineraries.json'), 'utf8')).manali;

/**
 * Make sure the demo account exists (with one sample trip), so the
 * "Try the demo account" button on the login page always works.
 * Safe to call on every start: does nothing if the demo user is already there.
 */
export const ensureDemoData = async () => {
  const existing = await User.findOne({ email: DEMO_EMAIL }).lean();
  if (existing) return existing;

  const user = await createUserWithRandomPassword({ name: 'Demo Traveler', email: DEMO_EMAIL, isDemo: true });

  const startDate = addDays(todayIso(), 21);
  const facts = {
    destination: 'Manali',
    startDate,
    endDate: addDays(startDate, 3),
    durationDays: 4,
    travelersCount: 2,
    totalBudget: 15000,
    budgetCategory: 'Moderate',
  };
  const itinerary = normalizeItinerary(loadManaliSample(), facts);
  const members = [
    { id: 'm-demo1', name: 'Demo' },
    { id: 'm-demo2', name: 'Riya' },
  ];
  const trip = await Trip.create({
    owner: user._id,
    title: itinerary.title,
    ...facts,
    destinationImage: itinerary.destinationImage,
    preferences: { interests: ['Nature & Outdoors', 'Adventure', 'Food & Cuisine'], travelStyle: 'Balanced' },
    itinerary,
    members,
  });
  // Part 15: a few bookings already paid, so the Expenses tab has something to show.
  const today = todayIso();
  const both = { mode: 'equal', members: members.map((m) => m.id) };
  await Expense.insertMany(
    [
      { description: 'Volvo bus tickets Delhi → Manali (2)', amountPaise: 280000, category: 'travel', date: today, paidBy: 'm-demo2', split: both },
      { description: 'Hotel advance (first night)', amountPaise: 350000, category: 'stay', date: today, paidBy: 'm-demo1', split: both },
      { description: 'Solang Valley ropeway tickets', amountPaise: 120000, category: 'activities', date: today, paidBy: 'm-demo1', split: both, note: 'Booked online' },
    ].map((e) => ({ ...e, trip: trip._id, owner: user._id, kind: 'expense' })),
  );
  return user.toObject();
};
