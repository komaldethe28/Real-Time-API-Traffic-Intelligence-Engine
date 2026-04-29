/**
 * Central configuration from environment variables with safe defaults.
 * @module config
 */
import dotenv from 'dotenv';

dotenv.config();

function bool(v, defaultValue = false) {
  if (v === undefined || v === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

function num(v, defaultValue) {
  const n = Number(v);
  return Number.isFinite(n) ? n : defaultValue;
}

export const config = {
  port: num(process.env.PORT, 3000),
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  trustProxy: bool(process.env.TRUST_PROXY, false),

  rateLimit: {
    windowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    max: num(process.env.RATE_LIMIT_MAX, 120),
    failOpen: bool(process.env.RATE_LIMIT_FAIL_OPEN, false),
  },

  anomaly: {
    spikeRatio: num(process.env.SPIKE_RATIO, 5),
    spikeMinBaseline: num(process.env.SPIKE_MIN_BASELINE, 5),
    endpointHammerWindowMs: num(process.env.ENDPOINT_HAMMER_WINDOW_MS, 60_000),
    endpointHammerThreshold: num(process.env.ENDPOINT_HAMMER_THRESHOLD, 80),
    scanWindowMs: num(process.env.SCAN_WINDOW_MS, 120_000),
    scanUniquePathsThreshold: num(process.env.SCAN_UNIQUE_PATHS_THRESHOLD, 40),
  },

  autoBlockTtlSec: num(process.env.AUTO_BLOCK_TTL_SEC, 900),
  autoThrottleTtlSec: num(process.env.AUTO_THROTTLE_TTL_SEC, 120),

  adminApiKey: process.env.ADMIN_API_KEY || '',
  wsToken: process.env.WS_TOKEN || '',

  intelligenceChannel: process.env.INTELLIGENCE_CHANNEL || 'traffic:intelligence',
};
