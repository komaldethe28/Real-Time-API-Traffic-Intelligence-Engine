/**
 * Early IP block enforcement (403) using Redis block keys.
 * @module middleware/blocklist
 */
import { getClientIp } from '../utils/ip.js';
import { isOpsBypassPath } from '../utils/bypassPaths.js';
import { isBlocked } from '../services/blocklistService.js';

/**
 * @type {import('express').RequestHandler}
 */
export async function blocklistMiddleware(req, res, next) {
  if (isOpsBypassPath(req.path)) return next();

  const ip = getClientIp(req);
  try {
    const blocked = await isBlocked(ip);
    if (blocked) {
      return res.status(403).json({ error: 'blocked', ip });
    }
  } catch {
    // Fail-open on Redis errors for availability
  }
  next();
}
