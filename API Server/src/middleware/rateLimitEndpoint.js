/**
 * Per-endpoint rate limiting with configurable limits.
 * @module middleware/rateLimitEndpoint
 */
import { config } from '../config/index.js';
import { getClientIp } from '../utils/ip.js';
import { isOpsBypassPath } from '../utils/bypassPaths.js';
import { consumeSlidingWindowToken } from '../services/rateLimitService.js';

/**
 * Endpoint-specific rate limits (requests per window).
 * Configure via ENDPOINT_RATE_LIMITS env var as JSON:
 * { "/api/auth/login": 10, "/api/auth/register": 5 }
 */
function parseEndpointLimits() {
  const env = process.env.ENDPOINT_RATE_LIMITS;
  if (!env) return {};
  try {
    return JSON.parse(env);
  } catch {
    return {};
  }
}

const endpointLimits = parseEndpointLimits();

/**
 * Get rate limit config for a path.
 * @param {string} path
 * @returns {{ limit: number, windowMs: number } | null}
 */
function getEndpointLimit(path) {
  // Exact match first
  if (endpointLimits[path]) {
    return { limit: endpointLimits[path], windowMs: config.rateLimit.windowMs };
  }
  // Prefix match (e.g., /api/auth/*)
  for (const [pattern, limit] of Object.entries(endpointLimits)) {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (path.startsWith(prefix)) {
        return { limit, windowMs: config.rateLimit.windowMs };
      }
    }
  }
  return null;
}

/**
 * Express middleware factory for per-endpoint rate limiting.
 * @type {import('express').RequestHandler}
 */
export async function rateLimitEndpoint(req, res, next) {
  if (isOpsBypassPath(req.path)) return next();

  const endpointLimit = getEndpointLimit(req.path);
  if (!endpointLimit) return next();

  const ip = getClientIp(req);
  const key = `rl:ep:${ip}:${req.path}`;

  try {
    const { allowed, count } = await consumeSlidingWindowToken({
      key,
      windowMs: endpointLimit.windowMs,
      limit: endpointLimit.limit,
    });

    res.setHeader('X-RateLimit-Limit', String(endpointLimit.limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, endpointLimit.limit - count)));
    res.setHeader('X-RateLimit-Window-Ms', String(endpointLimit.windowMs));

    if (!allowed) {
      const retryAfterSec = Math.ceil(endpointLimit.windowMs / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({ 
        error: 'rate_limited', 
        endpoint: req.path,
        limit: endpointLimit.limit 
      });
    }
    return next();
  } catch (err) {
    if (config.rateLimit.failOpen) {
      return next();
    }
    return res.status(503).json({ error: 'rate_limit_unavailable' });
  }
}