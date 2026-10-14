import mongoose from 'mongoose';
import { cleanJSON } from './toJSON.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    // bcrypt hash — never selected unless asked for with .select('+passwordHash')
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    avatarUrl: { type: String, trim: true },
    isDemo: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: cleanJSON((ret) => delete ret.passwordHash),
    toObject: cleanJSON((ret) => delete ret.passwordHash),
  },
);

/** Safe public shape used in API responses and as req.user. */
userSchema.statics.toPublic = (user) =>
  user && {
    id: String(user._id ?? user.id),
    name: user.name,
    email: user.email,
    role: user.role ?? 'user',
    avatarUrl: user.avatarUrl ?? null,
    isDemo: Boolean(user.isDemo),
    createdAt: user.createdAt,
  };

export const User = mongoose.models.User ?? mongoose.model('User', userSchema);
export default User;
