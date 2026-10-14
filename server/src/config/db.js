import mongoose from 'mongoose';
import { config } from './env.js';

mongoose.set('strictQuery', true);

/** Turn common connection errors into a hint a student can act on. */
const explain = (err) => {
  const msg = String(err?.message || err);
  if (/querySrv|ENOTFOUND|EREFUSED/i.test(msg)) {
    return 'DNS lookup for the Atlas cluster failed. Check your internet, or use the "standard connection string" from Atlas (see docs/SETUP_MONGODB.md, step 6).';
  }
  if (/bad auth|Authentication failed/i.test(msg)) {
    return 'Wrong database username or password in MONGODB_URI. Special characters in the password must be URL-encoded.';
  }
  if (/IP.*(whitelist|access list)|not authorized|Server selection timed out/i.test(msg)) {
    return 'Atlas is not accepting this computer. In Atlas → Network Access add your IP (or 0.0.0.0/0 for testing).';
  }
  if (/ECONNREFUSED/i.test(msg)) {
    return 'Nothing is listening at that address. Is your local MongoDB running?';
  }
  return 'Check MONGODB_URI in server/.env.';
};

/**
 * Connect to MongoDB. Throws a readable error (with a hint) if it fails.
 * @param {string} uri defaults to MONGODB_URI from server/.env
 */
export const connectDB = async (uri = config.mongoUri) => {
  if (!uri) {
    const err = new Error('MONGODB_URI is not set in server/.env. Follow docs/SETUP_MONGODB.md to create a free MongoDB Atlas database.');
    err.hint = 'MONGODB_URI missing';
    throw err;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, autoIndex: true });
  } catch (err) {
    err.hint = explain(err);
    throw err;
  }
  const { host, name } = mongoose.connection;
  if (!config.isTest) console.log(`[DB] Connected to MongoDB "${name}" at ${host}`);
  return mongoose.connection;
};

export const disconnectDB = () => mongoose.disconnect();

export const getDbStatus = () => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const state = states[mongoose.connection.readyState] ?? 'unknown';
  return {
    type: 'MongoDB',
    connected: state === 'connected',
    state,
    name: mongoose.connection.name || null,
  };
};
