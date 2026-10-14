import express from 'express';
import { projectInfo, collegeLabel } from '@tripplanner/shared';
import { config, serviceStatus } from '../config/env.js';
import { getDbStatus } from '../config/db.js';

const router = express.Router();

/** Real status of the server and its integrations (used by the Profile page). */
router.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    environment: config.env,
    version: projectInfo.version,
    project: `${projectInfo.name} - ${projectInfo.tagline}`,
    college: collegeLabel,
    database: getDbStatus(),
    services: { ...serviceStatus(), aiModel: config.gemini.model },
  });
});

export default router;
