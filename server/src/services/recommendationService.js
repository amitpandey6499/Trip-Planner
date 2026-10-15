import axios from 'axios';
import { BUDGET_TIER_VALUES, bookingSearchUrl, mapsSearchUrl } from '@tripplanner/shared';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { STAY_AMENITIES, STAY_LABEL } from './ai/offlinePlanner.js';
import { getDestination } from './destinationService.js';

/**
 * Part 10 — stays and places to eat for a destination. Honest by design:
 *   - stays are AREAS with a typical price per tier (we do not invent hotel names, ratings or reviews)
 *   - each one links to a real search (Booking.com, Google Maps) with the trip's dates already filled in
 *   - with GOOGLE_PLACES_API_KEY, real hotels with their real Google rating are added on top
 */

const notFound = (destination) =>
  ApiError.notFound(`We do not have stay and food suggestions for "${destination}" yet. Try one of the destinations on the Explore page.`, {
    field: 'destination',
  });

/** Real hotels from Google Places (only with an API key). Ratings are Google's; prices are not invented. */
const googleHotels = async (dest) => {
  if (!config.googlePlacesKey) return [];
  try {
    const res = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
      params: { query: `Hotels in ${dest.name}, ${dest.state}`, key: config.googlePlacesKey },
      timeout: 8000,
    });
    return (res.data?.results ?? []).slice(0, 6).map((place) => ({
      id: `google-${place.place_id}`,
      kind: 'hotel',
      name: place.name,
      address: place.formatted_address,
      rating: typeof place.rating === 'number' ? place.rating : undefined,
      ratingCount: place.user_ratings_total ?? undefined,
      ratingSource: 'Google',
      pricePerNight: null,
      coordinates: place.geometry?.location ?? null,
      links: { maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}` },
    }));
  } catch (err) {
    console.warn('[Places] Google Places failed, curated stays only:', err.message);
    return [];
  }
};

export const getStays = async ({ destination, budget = 'All', checkIn, checkOut, travelers = 2 }) => {
  const dest = await getDestination(destination);
  if (!dest) throw notFound(destination);
  const tiers = budget === 'All' ? BUDGET_TIER_VALUES : [budget];
  const dates = checkIn && checkOut && checkOut > checkIn ? { checkIn, checkOut } : {};

  const areas = dest.stays.flatMap((stay, i) =>
    tiers.map((tier) => ({
      id: `${dest.slug}-stay-${i + 1}-${tier.toLowerCase()}`,
      kind: 'area',
      name: `${STAY_LABEL[tier]} near ${stay.area}`,
      area: stay.area,
      address: `${stay.area}, ${dest.name}`,
      budgetTier: tier,
      pricePerNight: stay.prices?.[tier] ?? null,
      priceNote: 'Typical price per room per night (estimate)',
      amenities: STAY_AMENITIES[tier],
      coordinates: Number.isFinite(stay.lat) ? { lat: stay.lat, lng: stay.lng } : null,
      links: {
        booking: bookingSearchUrl({ place: `${stay.area}, ${dest.name}`, ...dates, adults: travelers }),
        maps: mapsSearchUrl(`hotels near ${stay.area}, ${dest.name}`),
      },
    })),
  );
  const google = await googleHotels(dest);
  return {
    destination: { slug: dest.slug, name: dest.name, state: dest.state },
    items: [...google, ...areas],
    sources: google.length ? ['google', 'curated'] : ['curated'],
  };
};

export const getRestaurants = async ({ destination, veg = false }) => {
  const dest = await getDestination(destination);
  if (!dest) throw notFound(destination);
  const items = dest.eateries
    .filter((e) => !veg || e.veg)
    .map((e, i) => ({
      id: `${dest.slug}-eat-${i + 1}`,
      name: e.name,
      cuisine: e.cuisine,
      area: e.area,
      address: `${e.area}, ${dest.name}`,
      veg: Boolean(e.veg),
      dietaryTags: e.veg ? ['Pure vegetarian'] : [],
      costForTwo: e.costForTwo ?? 0,
      priceNote: e.costForTwo === 0 ? 'Free' : 'Typical meal for two (estimate)',
      coordinates: Number.isFinite(e.lat) ? { lat: e.lat, lng: e.lng } : null,
      links: { maps: mapsSearchUrl(`${e.name}, ${e.area}, ${dest.name}`) },
    }));
  return {
    destination: { slug: dest.slug, name: dest.name, state: dest.state },
    items,
    note: dest.eateries.length === 0 ? (dest.notes.find((n) => /meal|food/i.test(n)) ?? 'No restaurant list for this destination yet.') : null,
  };
};
