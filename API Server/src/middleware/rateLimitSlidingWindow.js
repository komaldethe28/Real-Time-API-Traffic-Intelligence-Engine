/**
 * Global per-IP sliding window rate limiter (Redis + Lua).
 * @module middleware/rateLimitSlidingWindow
 */
import { config } from '../config/index.js';
import { getClientIp } from '../utils/ip.js';
import { isOpsBypassPath } from '../utils/bypassPaths.js';
import { consumeSlidingWindowToken } from '../services/rateLimitService.js';

/**
 * Express middleware factory (configured via env).
 * @type {import('express').RequestHandler}
 */
export async function rateLimitSlidingWindow(req, res, next) {
  if (isOpsBypassPath(req.path)) return next();

  const ip = getClientIp(req);
  const key = `rl:ip:${ip}`;

  try {
    const { allowed, count } = await consumeSlidingWindowToken({
      key,
      windowMs: config.rateLimit.windowMs,
      limit: config.rateLimit.max,
    });

    res.setHeader('X-RateLimit-Limit', String(config.rateLimit.max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, config.rateLimit.max - count)));
    res.setHeader('X-RateLimit-Window-Ms', String(config.rateLimit.windowMs));

    if (!allowed) {
      const retryAfterSec = Math.ceil(config.rateLimit.windowMs / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({ error: 'rate_limited', count });
    }
    return next();
  } catch (err) {
    if (config.rateLimit.failOpen) {
      return next();
    }
    return res.status(503).json({ error: 'rate_limit_unavailable' });
  }
}
