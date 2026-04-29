/**
 * Analytics + health routes (public read surface; protect in production via network policy).
 * @module routes/analyticsRoutes
 */
import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController.js';

export const analyticsRoutes = Router();

analyticsRoutes.get('/health', analyticsController.health);
analyticsRoutes.get('/analytics/overview', analyticsController.overview);
analyticsRoutes.get('/analytics/flags', analyticsController.flags);
analyticsRoutes.get('/analytics/ip/:ip', analyticsController.ipDetail);
