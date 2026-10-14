import { projectInfo, collegeLabel } from '@tripplanner/shared';
import { config, serviceStatus } from './config/env.js';
import app from './app.js';
import { initDB } from './config/db.js';

const start = async () => {
  await initDB();

  const server = app.listen(config.port, () => {
    const services = serviceStatus();
    console.log('='.repeat(60));
    console.log(` ${projectInfo.name} API  ->  http://localhost:${config.port}`);
    console.log(` Health check     ->  http://localhost:${config.port}/api/health`);
    console.log(` ${collegeLabel} | ${projectInfo.academicSession}`);
    console.log('='.repeat(60));
    if (!services.geminiAI) {
      console.log('[AI] GEMINI_API_KEY is not set: itineraries will use sample/offline mode.');
    } else {
      console.log(`[AI] Gemini model: ${config.gemini.model}`);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${config.port} is already in use. Stop the other process or change PORT in server/.env.`);
    } else {
      console.error('[Server] Failed to start:', err);
    }
    process.exit(1);
  });
};

start().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
