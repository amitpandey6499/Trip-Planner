import { config } from '../config/env.js';
import { Destination } from '../models/index.js';
import { ensureDestinations } from './destinationService.js';
import { GeoServiceError, getJson } from './geo/geoHttp.js';

/**
 * Part 10 — real destination photos from Wikipedia (the article's lead image, a freely licensed file).
 * The result is stored on the destination (cache), with links to the article and the file page so the
 * photo's author and licence can always be seen.
 */

const REFRESH_DAYS = 30;
const RETRY_AFTER_FAIL_HOURS = 24;

/** The lead image of a Wikipedia article, or null when it has none. Throws GeoServiceError when Wikipedia is unreachable. */
export const fetchWikipediaPhoto = async (title) => {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'pageimages|info',
    inprop: 'url',
    piprop: 'thumbnail|name',
    pithumbsize: '1280',
    pilicense: 'free',
    redirects: '1',
    titles: title,
  });
  const body = await getJson('wikipedia', `${config.photos.wikipediaApiUrl}?${params}`);
  const page = body?.query?.pages?.[0];
  if (!page || page.missing || !page.thumbnail?.source) return null;
  return {
    url: page.thumbnail.source,
    width: page.thumbnail.width ?? null,
    height: page.thumbnail.height ?? null,
    title: page.title,
    pageUrl: page.fullurl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    fileUrl: page.pageimage ? `https://en.wikipedia.org/wiki/File:${encodeURIComponent(page.pageimage)}` : null,
  };
};

/**
 * Find photos for destinations that have none (or an old one). Stops at the first network failure.
 * @returns {{ updated, missing, skipped, failed }}
 */
export const refreshDestinationPhotos = async ({ force = false } = {}) => {
  const stats = { updated: 0, missing: 0, skipped: 0, failed: 0 };
  if (!config.photos.enabled) return { ...stats, disabled: true };
  await ensureDestinations();
  const docs = await Destination.find({}).sort({ order: 1 });
  const now = Date.now();
  for (const doc of docs) {
    const photo = doc.photo ?? {};
    const fresh = photo.url && now - new Date(photo.fetchedAt).getTime() < REFRESH_DAYS * 86400000;
    const recentlyFailed = !photo.url && photo.failedAt && now - new Date(photo.failedAt).getTime() < RETRY_AFTER_FAIL_HOURS * 3600000;
    if (!force && (fresh || recentlyFailed)) {
      stats.skipped += 1;
      continue;
    }
    try {
      const found = await fetchWikipediaPhoto(doc.wikiTitle || doc.name);
      if (found) {
        doc.photo = { ...found, fetchedAt: new Date().toISOString() };
        stats.updated += 1;
      } else {
        doc.photo = photo.url ? photo : { failedAt: new Date().toISOString() };
        stats.missing += 1;
      }
      doc.markModified('photo');
      await doc.save();
    } catch (err) {
      stats.failed += 1;
      if (err instanceof GeoServiceError) break; // Wikipedia unreachable: try again on the next start
      throw err;
    }
  }
  return stats;
};
