/**
 * Records per-request telemetry and triggers anomaly evaluation (async, non-blocking).
 * Improved error handling with logging and graceful degradation.
 * @module middleware/trafficCapture
 */
import { getClientIp } from '../utils/ip.js';
import { buildEndpointKey } from '../utils/endpointKey.js';
import { isOpsBypassPath } from '../utils/bypassPaths.js';
import { recordRequest } from '../services/trafficService.js';
import { evaluateAndAct } from '../services/anomalyService.js';

/**
 * Safely log errors without crashing the request.
 * @param {string} context
 * @param {Error} err
 * @param {object} meta
 */
function logCaptureError(context, err, meta) {
  // Use console.error with structured data for log aggregation
  const timestamp = new Date().toISOString();
  console.error(
    JSON.stringify({
      timestamp,
      level: 'error',
      context,
      message: err?.message || String(err),
      stack: err?.stack,
      ...meta,
    })
  );
}

/**
 * @type {import('express').RequestHandler}
 */
export function trafficCaptureMiddleware(req, res, next) {
  if (isOpsBypassPath(req.path)) return next();

  const ip = getClientIp(req);
  const endpointKey = buildEndpointKey(req);
  const path = req.path || '/';
  const startTime = Date.now();

  setImmediate(async () => {
    try {
      await recordRequest({ ip, endpointKey, path });
      
      // Continue with anomaly evaluation even if recordRequest succeeded
      try {
        await evaluateAndAct({ ip, endpointKey, path });
      } catch (anomalyErr) {
        // Log but don't fail - anomaly evaluation is secondary
        logCaptureError('anomalyEvaluation', anomalyErr, { ip, endpointKey, path });
      }
    } catch (recordErr) {
      // Log but don't crash - traffic capture should not affect request
      logCaptureError('recordRequest', recordErr, { 
        ip, 
        endpointKey, 
        path,
        durationMs: Date.now() - startTime 
      });
    }
  });

  next();
}
