import mongoose from 'mongoose';

/** How many Gemini calls a user made on a given day (for the daily limit). */
const aiUsageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    day: { type: String, required: true }, // 'YYYY-MM-DD'
    count: { type: Number, default: 0 },
  },
  { timestamps: true },
);

aiUsageSchema.index({ user: 1, day: 1 }, { unique: true });

export const AiUsage = mongoose.models.AiUsage ?? mongoose.model('AiUsage', aiUsageSchema);
export default AiUsage;
