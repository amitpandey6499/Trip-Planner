import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { findDestinationDoc, listDestinations } from './destinationService.js';

/** Part 10 — ❤️ favourite destinations, stored on the user (newest first). */
const MAX_FAVORITES = 100;

const loadUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.unauthorized();
  return user;
};

export const listFavorites = async (userId) => {
  const user = await loadUser(userId);
  const all = await listDestinations();
  const bySlug = new Map(all.map((d) => [d.slug, d]));
  const slugs = (user.favorites ?? []).filter((slug) => bySlug.has(slug));
  return { slugs, destinations: slugs.map((slug) => bySlug.get(slug)) };
};

export const addFavorite = async (userId, slug) => {
  const dest = await findDestinationDoc(slug);
  if (!dest || dest.slug !== slug) throw ApiError.notFound('Destination not found.');
  const user = await loadUser(userId);
  const current = (user.favorites ?? []).filter((s) => s !== slug);
  if (current.length >= MAX_FAVORITES) throw ApiError.badRequest(`You can keep at most ${MAX_FAVORITES} favourites.`);
  user.favorites = [slug, ...current];
  await user.save();
  return user.favorites;
};

export const removeFavorite = async (userId, slug) => {
  const user = await loadUser(userId);
  user.favorites = (user.favorites ?? []).filter((s) => s !== slug);
  await user.save();
  return user.favorites;
};
