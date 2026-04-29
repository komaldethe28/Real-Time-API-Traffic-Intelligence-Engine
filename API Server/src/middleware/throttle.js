/**
 * Soft throttle for suspicious IPs (short TTL flag set by anomaly engine).
 * Returns 429 with Retry-After while the suspect key is present.
 * @module middleware/throttle
 */
import { getClientIp } from '../utils/ip.js';
import { isOpsBypassPath } from '../utils/bypassPaths.js';
import { isThrottled } from '../services/blocklistService.js';

/**
 * @type {import('express').RequestHandler}
 */
export async function softThrottleMiddleware(req, res, next) {
  if (isOpsBypassPath(req.path)) return next();

  const ip = getClientIp(req);
  try {
    const throttled = await isThrottled(ip);
    if (throttled) {
      res.setHeader('Retry-After', '2');
      return res.status(429).json({ error: 'throttled_suspicious' });
    }
  } catch {
    // ignore
  }
  next();
}
