/**
 * Periodic publisher for coarse real-time metrics (optional dashboard tick).
 * Baseline EMA per IP is updated in anomalyService on the hot path; this job
 * only emits lightweight aggregate signals for WebSocket subscribers.
 * @module jobs/baselineUpdater
 */
import { getRedis } from '../redis/client.js';
import { publishIntelligence } from '../services/eventBus.js';
import { utcMinuteKey } from '../services/trafficService.js';

/** @type {ReturnType<typeof setInterval> | null} */
let timer = null;

export function startBaselineUpdater() {
  if (timer) return;
  timer = setInterval(() => {
    tick().catch(() => {});
  }, 30_000);
  if (typeof timer.unref === 'function') timer.unref();
}

export function stopBaselineUpdater() {
  if (timer) clearInterval(timer);
  timer = null;
}

async function tick() {
  const redis = getRedis();
  const key = `traffic:total:minute:${utcMinuteKey()}`;
  const total = Number((await redis.get(key)) || 0);
  await publishIntelligence({
    type: 'metrics_tick',
    payload: { totalLastMinuteKey: key, approxTotal: total, ts: Date.now() },
  });
}
