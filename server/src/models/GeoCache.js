import mongoose from 'mongoose';

/**
 * Answers from the map services (Part 8), so the same place / route is never asked twice:
 *   kind 'place' → { found, lat, lng, name }   (Nominatim)
 *   kind 'route' → { provider, distanceKm, durationMin, legs, geometry }   (OSRM)
 *   kind 'weather' → Open-Meteo daily values (Part 11; forecast entries expire after a few hours)
 * The services' usage policies ask for caching; MongoDB removes old entries itself (TTL index).
 */
const geoCacheSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    kind: { type: String, enum: ['place', 'route', 'weather'], required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, minimize: false },
);

geoCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const GeoCache = mongoose.models.GeoCache ?? mongoose.model('GeoCache', geoCacheSchema);
export default GeoCache;
