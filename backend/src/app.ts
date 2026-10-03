import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

// Routers
import authRouter from './modules/auth/auth.router';
import propertyRouter from './modules/properties/property.router';
import roomRouter from './modules/rooms/room.router';
import tenantRouter from './modules/tenants/tenant.router';
import paymentRouter from './modules/payments/payment.router';
import subscriptionRouter from './modules/subscriptions/subscription.router';
import publicRouter from './modules/public/public.router';
import notificationsRouter from './modules/notifications/notifications.router';
import reportsRouter from './modules/reports/reports.router';
import adminRouter from './modules/admin/admin.router';

export function createApp() {
  const app = express();

  // ── Security ───────────────────────────────
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
  app.use(cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        env.ALLOWED_ORIGINS.includes(origin) ||
        (env.isDev() && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));

  // ── Rate Limiting ──────────────────────────
  app.use(rateLimit({
    windowMs: env.isDev() ? 60 * 1000 : env.RATE_LIMIT_WINDOW_MS,
    max: env.isDev() ? 5000 : env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'TOO_MANY_REQUESTS', message: 'Terlalu banyak request. Silakan coba lagi nanti.' },
    },
  }));

  // ── Body Parsing ───────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Logging ────────────────────────────────
  if (env.isDev()) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // ── Health Check ───────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), service: env.APP_NAME });
  });

  // ── API Routes ─────────────────────────────
  const API_PREFIX = '/api/v1';

  app.use(`${API_PREFIX}/auth`, authRouter);
  app.use(`${API_PREFIX}/properties`, propertyRouter);
  app.use(`${API_PREFIX}/rooms`, roomRouter);
  app.use(`${API_PREFIX}/properties/:propertyId/rooms`, roomRouter);
  app.use(`${API_PREFIX}/tenants`, tenantRouter);
  app.use(`${API_PREFIX}/payments`, paymentRouter);
  app.use(`${API_PREFIX}/subscriptions`, subscriptionRouter);
  app.use(`${API_PREFIX}/public`, publicRouter);
  app.use(`${API_PREFIX}/notifications`, notificationsRouter);
  app.use(`${API_PREFIX}/reports`, reportsRouter);
  app.use(`${API_PREFIX}/admin`, adminRouter);

  // ── Error Handling ─────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
