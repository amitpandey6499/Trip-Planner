import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { formatDate } from '@tripplanner/shared';
import { config } from '../config/env.js';
import { Trip } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { saveTrip } from './tripService.js';

/**
 * Part 14 — a trip can be shared as a read-only page: /share/:slug.
 * - Off by default; the owner turns it on / off. Turning it off and on again keeps the same address;
 *   "new link" makes a new address and the old one stops working.
 * - The slug is 64 random bits (11 characters), so nobody can guess other people's links.
 * - The public page never shows private things: no e-mail, home city, notes for the AI, packing ticks or expenses.
 */

const NOT_AVAILABLE = 'This shared trip is not available. The owner may have turned the link off or made a new one.';
const SLUG = /^[A-Za-z0-9_-]{6,32}$/;

const newSlug = () => crypto.randomBytes(8).toString('base64url');
export const shareUrl = (slug) => `${config.publicAppUrl}/share/${slug}`;

const shareInfo = (trip) => ({
  enabled: Boolean(trip.share?.enabled),
  slug: trip.share?.slug ?? null,
  views: trip.share?.views ?? 0,
  createdAt: trip.share?.createdAt ?? null,
  url: trip.share?.slug ? shareUrl(trip.share.slug) : null,
});

const findOwned = (tripId, ownerId) => (mongoose.isValidObjectId(tripId) ? Trip.findOne({ _id: tripId, owner: ownerId }) : null);

/** PUT /api/trips/:id/share { enabled, newLink } */
export const setSharing = async (tripId, ownerId, { enabled, newLink = false }) => {
  const trip = await findOwned(tripId, ownerId);
  if (!trip) throw ApiError.notFound('Trip not found.');
  if (enabled && !trip.itinerary) throw ApiError.badRequest('This trip has no itinerary to share yet.');

  if (enabled && (!trip.share?.slug || newLink)) {
    // A collision of 64 random bits is practically impossible; the unique index would still refuse it.
    trip.set('share.slug', newSlug());
    trip.set('share.createdAt', new Date());
    trip.set('share.views', 0);
  }
  trip.set('share.enabled', Boolean(enabled));
  // Sharing settings are not a change of the plan: keep updatedAt (Part 8 uses it to spot newer versions).
  await trip.save({ timestamps: false });
  return shareInfo(trip);
};

export const getShareInfo = async (tripId, ownerId) => {
  const trip = await findOwned(tripId, ownerId);
  if (!trip) throw ApiError.notFound('Trip not found.');
  return shareInfo(trip);
};

const findShared = async (slug) => {
  if (!SLUG.test(String(slug ?? ''))) throw ApiError.notFound(NOT_AVAILABLE);
  const trip = await Trip.findOne({ 'share.slug': slug, 'share.enabled': true }).populate('owner', 'name');
  if (!trip || !trip.itinerary) throw ApiError.notFound(NOT_AVAILABLE);
  return trip;
};

const firstName = (name) => String(name ?? '').trim().split(/\s+/)[0] || 'A traveller';

/**
 * GET /api/share/:slug — the public view. Views are counted for visitors (not for the owner).
 * @param {string} slug
 * @param {{ id: string } | null} viewer
 */
export const getSharedTrip = async (slug, viewer) => {
  const trip = await findShared(slug);
  const isOwner = Boolean(viewer) && String(trip.owner?._id ?? trip.owner) === String(viewer.id);
  if (!isOwner) await Trip.updateOne({ _id: trip._id }, { $inc: { 'share.views': 1 } }, { timestamps: false });
  return {
    slug: trip.share.slug,
    title: trip.title,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    durationDays: trip.durationDays,
    travelersCount: trip.travelersCount,
    totalBudget: trip.totalBudget,
    budgetCategory: trip.budgetCategory,
    destinationImage: trip.destinationImage,
    itinerary: trip.itinerary,
    sharedBy: firstName(trip.owner?.name),
    updatedAt: trip.updatedAt,
    isOwner,
    ...(isOwner && { tripId: String(trip._id), views: trip.share.views }),
  };
};

/** The shared trip for the PDF (no view counted). */
export const getSharedForExport = async (slug) => {
  const trip = await findShared(slug);
  return { itinerary: trip.itinerary, url: shareUrl(trip.share.slug), sharedBy: firstName(trip.owner?.name) };
};

/**
 * POST /api/share/:slug/copy — "Save a copy to my trips": the viewer gets their own trip
 * (same plan, map and style; not shared; no notes, home city or packing ticks of the owner).
 */
export const copySharedTrip = async (slug, userId) => {
  const trip = await findShared(slug);
  const p = trip.preferences ?? {};
  const { trip: copy } = await saveTrip(userId, {
    tripData: {
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      travelersCount: trip.travelersCount,
      totalBudget: trip.totalBudget,
      budgetCategory: trip.budgetCategory,
      destinationImage: trip.destinationImage,
    },
    preferences: {
      interests: p.interests ?? [],
      travelStyle: p.travelStyle,
      accommodationType: p.accommodationType,
      dietaryPreference: p.dietaryPreference,
      specialNotes: '',
      language: p.language ?? 'en',
    },
    itinerary: trip.itinerary,
  });
  return copy;
};

/**
 * Part 18: link-preview details for /share/:slug (WhatsApp, Telegram, Slack read the page's Open Graph tags).
 * Not counted as a view. null when the link is off / unknown.
 */
export const getShareMeta = async (slug) => {
  if (!SLUG.test(String(slug ?? ''))) return null;
  const trip = await Trip.findOne({ 'share.slug': slug, 'share.enabled': true }, 'title destination startDate endDate durationDays destinationImage share');
  if (!trip) return null;
  const days = `${trip.durationDays} ${trip.durationDays === 1 ? 'day' : 'days'}`;
  return {
    title: `${trip.title} · TripPlanner`,
    description: `${days} in ${trip.destination} (${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}): day-by-day plan, map, stays and costs. Shared on TripPlanner.`,
    image: /^https?:\/\//.test(trip.destinationImage ?? '') ? trip.destinationImage : null,
    url: shareUrl(trip.share.slug),
  };
};

/** For POST /api/trips/pdf: the share address of one of the user's trips, if its link is on. */
export const ownShareUrl = async (tripId, ownerId) => {
  if (!tripId) return null;
  const trip = await findOwned(tripId, ownerId);
  return trip?.share?.enabled && trip.share.slug ? shareUrl(trip.share.slug) : null;
};
