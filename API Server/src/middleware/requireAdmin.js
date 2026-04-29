/**
 * Protects admin routes with a static API key header.
 * @module middleware/requireAdmin
 */
import { config } from '../config/index.js';

/**
 * @type {import('express').RequestHandler}
 */
export function requireAdmin(req, res, next) {
  if (!config.adminApiKey) {
    return res.status(503).json({ error: 'admin_not_configured' });
  }
  if (req.get('x-admin-key') !== config.adminApiKey) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}
