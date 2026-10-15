/**
 * npm run photos -w server   → look up a Wikipedia photo for every destination again (normally done
 *                              automatically in the background when the server starts).
 */
import { connectDB, disconnectDB } from '../src/config/db.js';
import { refreshDestinationPhotos } from '../src/services/photoService.js';

try {
  await connectDB();
  const stats = await refreshDestinationPhotos({ force: true });
  if (stats.disabled) console.log('[Photos] PHOTOS_ENABLED=false in server/.env — nothing to do.');
  else console.log(`[Photos] ${stats.updated} photos found, ${stats.missing} destinations without a photo, ${stats.failed ? 'stopped: Wikipedia could not be reached' : 'done'}.`);
} catch (err) {
  console.error(`[Photos] Failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await disconnectDB().catch(() => {});
}
