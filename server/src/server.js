import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { initDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Initialize Database
    await initDB();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` TripPlanner AI Backend running on http://localhost:${PORT}`);
      console.log(` Health Check: http://localhost:${PORT}/api/health`);
      console.log(` ABES Institute of Technology (ABESIT) - 2026-27`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
