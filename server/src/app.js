import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { apiRateLimiter } from './middleware/rateLimitMiddleware.js';
import { AppError, notFoundHandler, errorHandler } from './middleware/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import researchRoutes from './routes/researchRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import healthRoutes from './routes/healthRoutes.js';

function normalizeOrigin(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());

  const allowedOrigins = env.clientUrl
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        const cleanOrigin = normalizeOrigin(origin);
        if (
          allowedOrigins.includes(cleanOrigin) ||
          (!env.isProd &&
            (cleanOrigin.startsWith('http://localhost:') ||
              cleanOrigin.startsWith('http://127.0.0.1:')))
        ) {
          return callback(null, true);
        }
        return callback(new AppError(`CORS blocked origin: ${cleanOrigin}`, 403, 'CORS_FORBIDDEN'));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use('/api', apiRateLimiter);

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/research', researchRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
