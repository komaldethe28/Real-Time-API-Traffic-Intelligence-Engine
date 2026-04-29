/**
 * Admin routes (API key protected + rate limited).
 * @module routes/adminRoutes
 */
import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { rateLimitAdmin } from '../middleware/rateLimitAdmin.js';
import * as adminController from '../controllers/adminController.js';

export const adminRoutes = Router();

// Apply admin rate limiting to all admin routes
adminRoutes.use(rateLimitAdmin);

adminRoutes.post('/admin/unblock', requireAdmin, adminController.unblock);
