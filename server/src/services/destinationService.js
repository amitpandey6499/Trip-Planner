import mongoose from 'mongoose';
import { findOfflinePlannerDestination } from '@tripplanner/shared';
import { DESTINATION_CATALOG, DESTINATION_SEED_VERSION } from '../data/destinationCatalog.js';
import { findOfflineDestination } from '../data/offlineDestinations.js';
import { Destination } from '../models/index.js';

/**
 * Part 10 — destinations from MongoDB (seeded from data/destinationCatalog.js the first time they are needed).
 */

let seeding = null;

/** Insert / update the curated catalog once per server start (keeps photos that were already found). */
export const ensureDestinations = () => {
  seeding ??= (async () => {
    const upToDate = await Destination.countDocuments({ seedVersion: DESTINATION_SEED_VERSION });
    if (upToDate >= DESTINATION_CATALOG.length) return;
    for (const [order, entry] of DESTINATION_CATALOG.entries()) {
      await Destination.findOneAndUpdate(
        { slug: entry.slug },
        { $set: { ...entry, order, seedVersion: DESTINATION_SEED_VERSION } },
        { upsert: true, setDefaultsOnInsert: true },
      );
    }
  })().catch((err) => {
    seeding = null;
    throw err;
  });
  return seeding;
};

/** The 8 offline-planner destinations take stays and eateries from the planner's data (one source of truth). */
const offlineExtras = (doc) => {
  const offline = findOfflineDestination(doc.name);
  if (!offline) return { offlinePlanner: false, stays: doc.stays ?? [], eateries: doc.eateries ?? [] };
  return {
    offlinePlanner: true,
    stays: offline.hubs.map((hub) => ({ area: hub.stayArea, lat: hub.lat, lng: hub.lng, prices: offline.stayPrices })),
    eateries: offline.eateries
      .filter((e) => !e.generic)
      .map((e) => ({
        name: e.name,
        area: offline.hubs.find((h) => h.id === e.hub)?.name ?? offline.name,
        cuisine: e.cuisine,
        veg: Boolean(e.veg),
        costForTwo: e.costForTwo,
        lat: e.lat,
        lng: e.lng,
      })),
  };
};

const imageOf = (doc) => {
  if (doc.photo?.url) {
    return { url: doc.photo.url, credit: { source: 'Wikipedia', pageUrl: doc.photo.pageUrl ?? null, fileUrl: doc.photo.fileUrl ?? null } };
  }
  if (doc.fallbackImage) return { url: doc.fallbackImage, credit: { source: 'Unsplash', note: 'illustrative photo' } };
  return { url: null, credit: null };
};

const currentMonth = () => new Date().getMonth() + 1;

/** Fields for lists and cards. */
export const toSummary = (doc, month = currentMonth()) => {
  const image = imageOf(doc);
  return {
    slug: doc.slug,
    name: doc.name,
    state: doc.state,
    categories: doc.categories ?? [],
    interests: doc.interests ?? [],
    summary: doc.summary,
    highlights: (doc.highlights ?? []).slice(0, 3),
    bestMonths: doc.bestMonths ?? [],
    inSeason: (doc.bestMonths ?? []).includes(month),
    idealDays: doc.idealDays ?? [],
    dailyBudget: doc.dailyBudget ?? {},
    center: doc.center,
    image: image.url,
    imageCredit: image.credit,
    offlinePlanner: Boolean(findOfflineDestination(doc.name)),
  };
};

/** Everything for the destination page. */
export const toDetail = (doc, month = currentMonth()) => ({
  ...toSummary(doc, month),
  highlights: doc.highlights ?? [],
  terrain: doc.terrain ?? [],
  reach: doc.reach ?? {},
  busName: doc.busName ?? doc.name,
  notes: doc.notes ?? [],
  wikiUrl: doc.photo?.pageUrl ?? (doc.wikiTitle ? `https://en.wikipedia.org/wiki/${encodeURIComponent(doc.wikiTitle.replace(/ /g, '_'))}` : null),
  ...offlineExtras(doc),
});

const SORTS = {
  popular: (a, b) => a.order - b.order,
  name: (a, b) => a.name.localeCompare(b.name),
  budget: (a, b) => (a.dailyBudget?.Moderate ?? 0) - (b.dailyBudget?.Moderate ?? 0),
};

/**
 * @param {{ q?: string, category?: string, sort?: 'popular'|'name'|'budget'|'season', month?: number }} options
 */
export const listDestinations = async ({ q = '', category = 'All', sort = 'popular', month } = {}) => {
  await ensureDestinations();
  const m = Number(month) >= 1 && Number(month) <= 12 ? Number(month) : currentMonth();
  let docs = await Destination.find({}).lean();

  if (category && category.toLowerCase() !== 'all') {
    const wanted = category.toLowerCase();
    docs = docs.filter((d) => (d.categories ?? []).some((c) => c.toLowerCase() === wanted));
  }
  const query = q.trim().toLowerCase();
  if (query) {
    docs = docs.filter((d) =>
      [d.name, d.state, d.summary, ...(d.highlights ?? []), ...(d.interests ?? [])].some((text) => String(text ?? '').toLowerCase().includes(query)),
    );
  }
  if (sort === 'season') {
    docs.sort((a, b) => Number((b.bestMonths ?? []).includes(m)) - Number((a.bestMonths ?? []).includes(m)) || a.order - b.order);
  } else {
    docs.sort(SORTS[sort] ?? SORTS.popular);
  }
  return docs.map((d) => toSummary(d, m));
};

const normalize = (text) =>
  String(text ?? '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** "Manali", "manali", "Leh", "Panjim", "Coorg", "McLeod Ganj, Himachal" → the catalog entry (lean doc) or null. */
export const findDestinationDoc = async (text) => {
  await ensureDestinations();
  const wanted = normalize(text);
  if (!wanted) return null;
  const docs = await Destination.find({}).lean();
  const offline = findOfflinePlannerDestination(text)?.name;
  // every name a traveller might type: slug, name, the part in brackets, Wikipedia title, bus-site name, and their words
  const keysOf = (d) => {
    const names = [d.slug, d.name, String(d.name).replace(/[()]/g, ' '), d.wikiTitle, d.busName].map(normalize).filter(Boolean);
    return [...names, ...names.flatMap((n) => n.split(' '))];
  };
  return (
    docs.find((d) => d.slug === wanted || normalize(d.name) === wanted) ??
    (offline ? docs.find((d) => d.name === offline) : null) ??
    docs.find((d) => normalize(d.wikiTitle) === wanted) ??
    docs.find((d) => wanted.startsWith(`${normalize(d.name)} `) || wanted.startsWith(`${d.slug} `)) ??
    // "Leh", "Coorg", "Dharamshala", "Cherrapunji": one word of the catalog name, at least 4 letters
    docs.find((d) => wanted.length >= 4 && keysOf(d).includes(wanted.split(' ')[0])) ??
    null
  );
};

export const getDestination = async (slugOrName) => {
  const doc = await findDestinationDoc(slugOrName);
  return doc ? toDetail(doc) : null;
};

/** Best photo for an itinerary header (Wikipedia photo, else the curated one), or null. */
export const imageForDestination = async (name) => {
  if (mongoose.connection.readyState !== 1) return null; // no database (unit tests): curated image only
  try {
    const doc = await findDestinationDoc(name);
    return doc ? imageOf(doc).url : null;
  } catch {
    return null;
  }
};
