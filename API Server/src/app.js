/**
 * Express application factory: middleware order matches the architecture plan.
 * @module app
 */
import express from 'express';
import { config } from './config/index.js';
import { blocklistMiddleware } from './middleware/blocklist.js';
import { trafficCaptureMiddleware } from './middleware/trafficCapture.js';
import { rateLimitSlidingWindow } from './middleware/rateLimitSlidingWindow.js';
import { rateLimitEndpoint } from './middleware/rateLimitEndpoint.js';
import { softThrottleMiddleware } from './middleware/throttle.js';
import { analyticsRoutes } from './routes/analyticsRoutes.js';
import { adminRoutes } from './routes/adminRoutes.js';

export function createApp() {
  const app = express();

  if (config.trustProxy) {
    app.set('trust proxy', 1);
  }

  // CORS: allow UI origin(s)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowed = ['http://localhost:8080', 'http://localhost:8081'];
    if (allowed.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // 1) Block known bad IPs before spending work elsewhere
  app.use(blocklistMiddleware);
  // 2) Capture metrics + anomaly signals (non-blocking best-effort)
  app.use(trafficCaptureMiddleware);
  // 3) Optional soft throttle for flagged-but-not-blocked clients
  app.use(softThrottleMiddleware);
  // 4) Global sliding-window rate limit (Lua + Redis)
  app.use(rateLimitSlidingWindow);
  // 5) Per-endpoint rate limiting (stricter limits for sensitive endpoints)
  app.use(rateLimitEndpoint);

  app.use('/api/v1', analyticsRoutes);
  app.use('/api/v1', adminRoutes);

  // Root API index to avoid "Cannot GET /" and help local discovery.
  app.get('/', (_req, res) => {
    res.json({
      name: 'API Traffic Intelligence Engine',
      status: 'ok',
      endpoints: {
        health: '/api/v1/health',
        demoPing: '/demo/ping',
        analyticsOverview: '/api/v1/analytics/overview',
        analyticsFlags: '/api/v1/analytics/flags',
      },
    });
  });

  // Demo endpoints to generate traffic (not under /api/v1 to show path normalization)
  app.get('/demo/ping', (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });
  app.get('/demo/heavy', (_req, res) => {
    res.json({ ok: true, work: 'simulated' });
  });

  app.use((err, _req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  });

  return app;
}
