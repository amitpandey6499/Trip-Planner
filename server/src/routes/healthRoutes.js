import express from 'express';
import { getDbStatus } from '../config/db.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: getDbStatus(),
    version: '1.0.0',
    college: 'ABES Institute of Technology (ABESIT), Ghaziabad',
    project: 'TripPlanner — AI-Powered Smart Trip Planner'
  });
});

export default router;
