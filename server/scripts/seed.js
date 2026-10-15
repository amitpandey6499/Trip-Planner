/**
 * npm run seed            → create the demo account + sample trip (if missing)
 * npm run seed -- --reset → delete the demo account and its trips, then create them again
 * (also adds / updates the destination catalog, Part 10)
 */
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Trip, User } from '../src/models/index.js';
import { DEMO_EMAIL, ensureDemoData } from '../src/services/demoService.js';
import { ensureDestinations } from '../src/services/destinationService.js';

const reset = process.argv.includes('--reset');

try {
  await connectDB();
  if (reset) {
    const demo = await User.findOne({ email: DEMO_EMAIL });
    if (demo) {
      const { deletedCount } = await Trip.deleteMany({ owner: demo._id });
      await User.deleteOne({ _id: demo._id });
      console.log(`[Seed] Removed demo account and ${deletedCount} trip(s).`);
    }
  }
  await ensureDestinations();
  const user = await ensureDemoData();
  const trips = await Trip.countDocuments({ owner: user._id });
  console.log(`[Seed] Demo account ready: ${DEMO_EMAIL} (${trips} trip(s)). Use "Try the demo account" on the login page.`);
} catch (err) {
  console.error(`[Seed] Failed: ${err.message}`);
  if (err.hint) console.error(`[Seed] Hint: ${err.hint}`);
  process.exitCode = 1;
} finally {
  await disconnectDB().catch(() => {});
}
