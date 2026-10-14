import mongoose from 'mongoose';
import { calcDuration, normalizeItinerary, ItineraryError } from '@tripplanner/shared';
import { Trip } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * All trip database work lives here. EVERY query includes `owner`,
 * so one user can never read, change or delete another user's trip.
 */

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80';

/** Bad or foreign ids are simply "not found" (never a 500 CastError, never "exists but not yours"). */
const findOwned = (tripId, ownerId) => {
  if (!mongoose.isValidObjectId(tripId)) return null;
  return Trip.findOne({ _id: tripId, owner: ownerId });
};

const normalizeOrReject = (rawItinerary, facts) => {
  if (rawItinerary === undefined || rawItinerary === null) return null;
  try {
    return normalizeItinerary(rawItinerary, facts);
  } catch (err) {
    if (err instanceof ItineraryError) throw ApiError.badRequest(err.message, { field: 'itinerary', fields: err.details });
    throw err;
  }
};

/** My Trips list — newest first, without the (large) itinerary. */
export const listTrips = async (ownerId) => {
  const trips = await Trip.find({ owner: ownerId }).sort({ createdAt: -1 }).select('-itinerary');
  return trips.map((t) => t.toJSON());
};

export const getTrip = async (tripId, ownerId) => {
  const trip = await findOwned(tripId, ownerId);
  if (!trip) throw ApiError.notFound('Trip not found.');
  return trip.toJSON();
};

/**
 * Create a trip, or update it when tripData.id is one of the user's trips.
 * The itinerary is normalized (shared contract) before it is stored.
 */
export const saveTrip = async (ownerId, { tripData, preferences, itinerary: rawItinerary }) => {
  const facts = {
    destination: tripData.destination,
    startDate: tripData.startDate,
    endDate: tripData.endDate,
    durationDays: calcDuration(tripData.startDate, tripData.endDate),
    travelersCount: tripData.travelersCount,
    totalBudget: tripData.totalBudget,
    budgetCategory: tripData.budgetCategory,
  };
  const itinerary = normalizeOrReject(rawItinerary, facts);

  const fields = {
    ...facts,
    title: tripData.title || itinerary?.title || `${tripData.destination} Trip`,
    destinationImage: tripData.destinationImage || itinerary?.destinationImage || DEFAULT_IMAGE,
    ...(preferences && { preferences }),
    ...(itinerary && { itinerary }),
  };

  if (tripData.id) {
    const existing = await findOwned(tripData.id, ownerId);
    if (!existing) throw ApiError.notFound('Trip not found.');
    existing.set(fields);
    await existing.save();
    return { trip: existing.toJSON(), created: false };
  }

  const trip = await Trip.create({ ...fields, owner: ownerId });
  return { trip: trip.toJSON(), created: true };
};

/** PUT — only whitelisted fields arrive here (UpdateTripSchema). */
export const updateTrip = async (tripId, ownerId, changes) => {
  const trip = await findOwned(tripId, ownerId);
  if (!trip) throw ApiError.notFound('Trip not found.');

  const startDate = changes.startDate ?? trip.startDate;
  const endDate = changes.endDate ?? trip.endDate;
  if (endDate < startDate) throw ApiError.badRequest('End date cannot be before start date.', { field: 'endDate' });

  const durationDays = calcDuration(startDate, endDate);
  if (trip.itinerary && durationDays !== trip.durationDays) {
    throw ApiError.badRequest(
      `This itinerary has ${trip.durationDays} days. To change the number of days, use Edit → Regenerate.`,
      { field: 'endDate' },
    );
  }

  trip.set({ ...changes, durationDays });
  // Same length, new dates / travelers / budget: keep the itinerary's facts in sync.
  if (trip.itinerary) {
    trip.itinerary = normalizeItinerary(trip.itinerary, {
      startDate,
      endDate,
      durationDays: trip.itinerary.durationDays,
      travelersCount: trip.travelersCount,
      totalBudget: trip.totalBudget,
      budgetCategory: trip.budgetCategory,
    });
    trip.markModified('itinerary');
  }
  await trip.save();
  return trip.toJSON();
};

export const deleteTrip = async (tripId, ownerId) => {
  if (!mongoose.isValidObjectId(tripId)) throw ApiError.notFound('Trip not found.');
  const result = await Trip.deleteOne({ _id: tripId, owner: ownerId });
  if (result.deletedCount === 0) throw ApiError.notFound('Trip not found.');
};

export const countTrips = (ownerId) => Trip.countDocuments({ owner: ownerId });
