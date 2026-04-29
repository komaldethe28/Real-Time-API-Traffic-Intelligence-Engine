/**
 * Rate limiting for admin API endpoints to prevent admin brute force.
 * @module middleware/rateLimitAdmin
 */
import { config } from '../config/index.js';
import { getClientIp } from '../utils/ip.js';
import { consumeSlidingWindowToken } from '../services/rateLimitService.js';

const ADMIN_WINDOW_MS = 60_000; // 1 minute
const ADMIN_RATE_LIMIT = 30; // 30 requests per minute

/**
 * @type {import('express').RequestHandler}
 */
export async function rateLimitAdmin(req, res, next) {
  const ip = getClientIp(req);
  const key = `rl:admin:${ip}`;

  try {
    const { allowed, count } = await consumeSlidingWindowToken({
      key,
      windowMs: ADMIN_WINDOW_MS,
      limit: ADMIN_RATE_LIMIT,
    });

    res.setHeader('X-RateLimit-Limit', String(ADMIN_RATE_LIMIT));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, ADMIN_RATE_LIMIT - count)));

    if (!allowed) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ error: 'admin_rate_limited' });
    }
    return next();
  } catch (err) {
    // Fail open for admin to avoid locking ourselves out
    return next();
  }
}