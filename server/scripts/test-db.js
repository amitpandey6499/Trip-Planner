/**
 * Database for automated tests.
 *  - If TEST_MONGODB_URI is set, that server is used (a fresh, uniquely named database).
 *  - Otherwise a real MongoDB is started in memory with mongodb-memory-server
 *    (the first run downloads MongoDB once, ~70 MB, then it is cached).
 * Every test file gets an empty database and drops it at the end.
 */
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';

let memoryServer = null;

export const startTestDb = async () => {
  const dbName = `tripplanner_test_${randomBytes(4).toString('hex')}`;
  let base = process.env.TEST_MONGODB_URI;
  if (!base) {
    const { MongoMemoryServer } = await import('mongodb-memory-server-core');
    memoryServer = await MongoMemoryServer.create();
    base = memoryServer.getUri();
  }
  const url = new URL(base);
  url.pathname = `/${dbName}`;
  await connectDB(url.toString());
  // Build indexes (e.g. unique email) before tests run.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
};

export const stopTestDb = async () => {
  try {
    await mongoose.connection.dropDatabase();
  } finally {
    await disconnectDB();
    if (memoryServer) await memoryServer.stop();
    memoryServer = null;
  }
};
