import { projectInfo, collegeLabel } from '@tripplanner/shared';
import { config, serviceStatus } from './config/env.js';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { ensureDemoData } from './services/demoService.js';

const start = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error(`\n[DB] Could not connect to MongoDB: ${err.message}`);
    console.error(`[DB] Hint: ${err.hint}\n`);
    process.exit(1);
  }

  if (config.auth.demoLoginEnabled) {
    await ensureDemoData();
  }

  const server = app.listen(config.port, () => {
    const services = serviceStatus();
    console.log('='.repeat(60));
    console.log(` ${projectInfo.name} API  ->  http://localhost:${config.port}`);
    console.log(` Health check     ->  http://localhost:${config.port}/api/health`);
    console.log(` ${collegeLabel} | ${projectInfo.academicSession}`);
    console.log('='.repeat(60));
    if (!services.geminiAI) console.log('[AI] GEMINI_API_KEY is not set: the offline planner is used (8 curated destinations).');
    else console.log(`[AI] Gemini model: ${config.gemini.model}, ${config.gemini.dailyLimit} plans per user per day.`);
    if (config.auth.usingDevSecret) console.log('[Auth] JWT_SECRET not set: using a development-only secret (set one before deploying).');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${config.port} is already in use. Stop the other process or change PORT in server/.env.`);
    } else {
      console.error('[Server] Failed to start:', err);
    }
    process.exit(1);
  });

  // Close the HTTP server and the DB connection cleanly (Ctrl+C, nodemon restart, hosting shutdown).
  const shutdown = (signal) => {
    console.log(`[Server] ${signal} received, shutting down...`);
    server.close(() => {
      disconnectDB().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
};

start().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
