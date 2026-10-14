import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { addDays, normalizeItinerary, todayIso } from '@tripplanner/shared';
import { Trip, User } from '../models/index.js';
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
  await Trip.create({
    owner: user._id,
    title: itinerary.title,
    ...facts,
    destinationImage: itinerary.destinationImage,
    preferences: { interests: ['Nature & Outdoors', 'Adventure', 'Food & Cuisine'], travelStyle: 'Balanced' },
    itinerary,
  });
  return user.toObject();
};
