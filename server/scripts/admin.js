/**
 * Part 17 — give or take the admin dashboard (stored in the database):
 *   npm run admin -w server -- add you@example.com
 *   npm run admin -w server -- remove you@example.com
 *   npm run admin -w server -- list
 * (Or put the e-mail in ADMIN_EMAILS in server/.env — handy on a hosting service.)
 */
import { connectDB, disconnectDB } from '../src/config/db.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/index.js';

const [command, rawEmail] = process.argv.slice(2);
const email = String(rawEmail ?? '').trim().toLowerCase();

try {
  await connectDB();
  if (command === 'list') {
    const admins = await User.find({ role: 'admin' }, 'name email').lean();
    console.log(`[Admin] In the database: ${admins.map((a) => `${a.name} <${a.email}>`).join(', ') || 'nobody'}`);
    console.log(`[Admin] From ADMIN_EMAILS: ${config.auth.adminEmails.join(', ') || 'nobody'}`);
  } else if ((command === 'add' || command === 'remove') && email) {
    const user = await User.findOne({ email });
    if (!user) throw new Error(`No account with the e-mail ${email}. Sign up first, then run this again.`);
    if (user.isDemo) throw new Error('The shared demo account can not be an admin.');
    user.role = command === 'add' ? 'admin' : 'user';
    await user.save();
    console.log(`[Admin] ${user.name} <${email}> is ${command === 'add' ? 'now an admin' : 'no longer an admin'}. They see the change after their next page load.`);
  } else {
    console.log('Usage: npm run admin -w server -- add <email> | remove <email> | list');
    process.exitCode = 1;
  }
} catch (err) {
  console.error(`[Admin] ${err.message}`);
  process.exitCode = 1;
} finally {
  await disconnectDB().catch(() => {});
}
