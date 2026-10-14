import mongoose from 'mongoose';

/**
 * Saved Gemini answers. Same request (destination, month, length, budget, interests...)
 * → answer comes from here instantly and costs no AI quota.
 * MongoDB deletes entries automatically after `expiresAt` (TTL index).
 */
const aiCacheSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    model: { type: String, required: true },
    itinerary: { type: mongoose.Schema.Types.Mixed, required: true },
    hits: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, minimize: false },
);

aiCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AiCache = mongoose.models.AiCache ?? mongoose.model('AiCache', aiCacheSchema);
export default AiCache;
