import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { rateLimiterMiddleware } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

import healthRoutes from './routes/healthRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import placesRoutes from './routes/placesRoutes.js';
import recommendationsRoutes from './routes/recommendationsRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-demo-user', 'x-user-id', 'x-user-email']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global rate limiting & security shield
app.use(rateLimiterMiddleware);

// API Route Mounts
app.use('/api/health', healthRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/user', userRoutes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'TripPlanner AI API Server is operational',
    docs: '/api/health',
    institution: 'ABES Institute of Technology (ABESIT), Ghaziabad',
    academicSession: '2026-27'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot find endpoint ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
