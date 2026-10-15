import mongoose from 'mongoose';
import { cleanJSON } from './toJSON.js';

/**
 * Part 10 — a destination in the catalog (seeded from data/destinationCatalog.js).
 * Curated facts live in the seed file; only `photo` is filled in by the app (Wikipedia, services/photoService.js),
 * so re-seeding never throws a found photo away.
 */
const destinationSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    categories: [{ type: String }],
    interests: [{ type: String }],
    summary: { type: String, default: '' },
    highlights: [{ type: String }],
    bestMonths: [{ type: Number, min: 1, max: 12 }],
    idealDays: [{ type: Number, min: 1, max: 30 }],
    dailyBudget: { type: mongoose.Schema.Types.Mixed, default: {} },
    center: { lat: Number, lng: Number },
    wikiTitle: { type: String },
    fallbackImage: { type: String },
    terrain: [{ type: String }],
    reach: { type: mongoose.Schema.Types.Mixed, default: {} },
    busName: { type: String },
    notes: [{ type: String }],
    stays: { type: mongoose.Schema.Types.Mixed, default: [] },
    eateries: { type: mongoose.Schema.Types.Mixed, default: [] },
    order: { type: Number, default: 0 }, // catalog order = "popular" sort
    seedVersion: { type: Number, default: 0 },
    // { url, width, height, pageUrl, fileUrl, title, fetchedAt } — or { failedAt } when the last lookup found nothing
    photo: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true, minimize: false, toJSON: cleanJSON() },
);

export const Destination = mongoose.models.Destination ?? mongoose.model('Destination', destinationSchema);
export default Destination;
