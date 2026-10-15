import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { projectInfo } from '@tripplanner/shared';
import { config } from './config/env.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import mapRoutes from './routes/mapRoutes.js';
import { destinationRoutes, favoriteRoutes, legacyPlacesRoutes, recommendationRoutes } from './routes/destinationRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import travelRoutes from './routes/travelRoutes.js';
import shareRoutes from './routes/shareRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { clientApp } from './web/clientApp.js';
import { buildOpenApi } from './docs/openapi.js';
import { renderDocsPage } from './docs/docsPage.js';

const app = express();

if (config.trustProxy) app.set('trust proxy', 1);
app.disable('x-powered-by');

// Security headers. The policy matters once Express serves the React app (Part 18):
// map tiles, Wikipedia / Unsplash photos (any https image), Google Fonts; scripts only from this site.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], // Leaflet and React set inline styles
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'"],
        workerSrc: ["'self'", 'blob:'], // the confetti animation draws in a small blob: worker
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: null, // Render serves https already; locally it would break http://localhost
      },
    },
    crossOriginEmbedderPolicy: false, // photos from other sites
    // OpenStreetMap's tile policy asks browsers to send a Referer, so no "no-referrer" here.
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }),
);
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

// JSON bodies only. (No urlencoded parser: a plain HTML form on another site
// cannot send JSON, which is part of our CSRF protection for cookie logins.)
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

if (config.isDev) app.use(morgan('dev'));

app.use('/api', apiLimiter);
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/places', legacyPlacesRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/travel', travelRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/admin', adminRoutes);

// Part 18: API documentation — machine-readable (OpenAPI 3.1) and a readable page.
let docsHtml = null;
app.get('/api/openapi.json', (_req, res) => res.json(buildOpenApi()));
app.get('/api/docs', (_req, res) => {
  docsHtml ??= renderDocsPage(buildOpenApi());
  res.type('html').send(docsHtml);
});

if (config.client.serve) {
  // Part 18: the React app from client/dist (one service for app + API).
  app.use(clientApp({ distDir: config.client.distDir }));
} else {
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: `${projectInfo.name} API is running`,
      health: '/api/health',
      docs: '/api/docs',
    });
  });
}

app.use(notFound);
app.use(errorHandler);

export default app;
