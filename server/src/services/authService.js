import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

const BCRYPT_ROUNDS = 10;
const INVALID_LOGIN = 'Invalid email or password.'; // same message for "no such email" and "wrong password"
// Compared against when the email does not exist, so both cases take the same time.
const DUMMY_HASH = bcrypt.hashSync('no-such-user-placeholder', BCRYPT_ROUNDS);

export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

const isDuplicateKey = (err) => err?.code === 11000;

export const registerUser = async ({ name, email, password }) => {
  // Friendly check first; the unique index is the real guarantee (handled below).
  if (await User.exists({ email })) throw new ApiError(409, 'An account with this email already exists.', { field: 'email' });
  try {
    const user = await User.create({ name, email, passwordHash: await hashPassword(password), lastLoginAt: new Date() });
    return User.toPublic(user);
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
  return User.toPublic(user);
};

export const findUserById = async (id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  const user = await User.findById(id).lean();
  return User.toPublic(user);
};

/** Creates a user with a random password that nobody knows (used for the demo account). */
export const createUserWithRandomPassword = async (fields) =>
  User.create({ ...fields, passwordHash: await hashPassword(randomBytes(24).toString('hex')) });
