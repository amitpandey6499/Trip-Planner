import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

const BCRYPT_ROUNDS = 10;
const INVALID_LOGIN = 'Invalid email or password.'; // same message for "no such email" and "wrong password"
// Compared against when the email does not exist, so both cases take the same time.
const DUMMY_HASH = bcrypt.hashSync('no-such-user-placeholder', BCRYPT_ROUNDS);

export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

/**
 * Part 17: an account is an admin when its stored role is 'admin' (npm run admin) or its e-mail is in ADMIN_EMAILS.
 * The shared demo account is never an admin.
 */
const publicUser = (user) => {
  const pub = User.toPublic(user);
  if (pub && !pub.isDemo && config.auth.adminEmails.includes(String(pub.email).toLowerCase())) return { ...pub, role: 'admin' };
  if (pub?.isDemo) return { ...pub, role: 'user' };
  return pub;
};

const isDuplicateKey = (err) => err?.code === 11000;

export const registerUser = async ({ name, email, password }) => {
  // Friendly check first; the unique index is the real guarantee (handled below).
  if (await User.exists({ email })) throw new ApiError(409, 'An account with this email already exists.', { field: 'email' });
  try {
    const user = await User.create({ name, email, passwordHash: await hashPassword(password), lastLoginAt: new Date() });
    return publicUser(user);
  } catch (err) {
    if (isDuplicateKey(err)) throw new ApiError(409, 'An account with this email already exists.', { field: 'email' });
    throw err;
  }
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+passwordHash');
  // Compare even when the user is missing, so response time does not reveal which emails exist.
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new ApiError(401, INVALID_LOGIN);
  user.lastLoginAt = new Date();
  await user.save();
  return publicUser(user);
};

export const findUserById = async (id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  const user = await User.findById(id).lean();
  return publicUser(user);
};

/** Creates a user with a random password that nobody knows (used for the demo account). */
export const createUserWithRandomPassword = async (fields) =>
  User.create({ ...fields, passwordHash: await hashPassword(randomBytes(24).toString('hex')) });
