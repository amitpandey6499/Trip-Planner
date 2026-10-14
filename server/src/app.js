import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { projectInfo } from '@tripplanner/shared';
import { config } from './config/env.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

import healthRoutes from './routes/healthRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import placesRoutes from './routes/placesRoutes.js';
import recommendationsRoutes from './routes/recommendationsRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();

if (config.trustProxy) app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin / server-to-server requests (no Origin header) and configured client URLs.
      if (!origin || config.clientUrls.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (config.isDev) app.use(morgan('dev'));

app.use('/api', apiLimiter);
app.use('/api/health', healthRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/user', userRoutes);

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: `${projectInfo.name} API is running`,
    health: '/api/health',
  });
});

app.use(notFound);
app.use(errorHandler);

export default app;
