/**
 * REST handlers for analytics and health.
 * @module controllers/analyticsController
 */
import { getRedis } from '../redis/client.js';
import {
  getMinuteRollup,
  recentMinuteKeys,
  utcMinuteKey,
} from '../services/trafficService.js';
import { readFlags, readFlagsForIp } from '../services/auditService.js';
import { listBlockedIps } from '../services/blocklistService.js';

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function health(req, res) {
  try {
    const redis = getRedis();
    const pong = await redis.ping();
    res.json({ ok: true, redis: pong, ts: Date.now() });
  } catch (e) {
    res.status(503).json({ ok: false, error: 'redis_unavailable' });
  }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function overview(req, res) {
  const minutes = Number(req.query.minutes || 10);
  const keys = recentMinuteKeys(Math.min(60, Math.max(1, minutes)));
  const rollups = await Promise.all(keys.map((k) => getMinuteRollup(k)));
  const blocked = await listBlockedIps(50);
  res.json({
    minutes: keys,
    rollups,
    currentMinuteKey: utcMinuteKey(),
    blockedSample: blocked,
  });
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function flags(req, res) {
  const count = Math.min(500, Math.max(1, Number(req.query.count || 50)));
  const items = await readFlags({ startId: '+', count });
  res.json({ items });
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function ipDetail(req, res) {
  const ip = String(req.params.ip || '');
  if (!ip) return res.status(400).json({ error: 'missing_ip' });

  const redis = getRedis();
  const minuteKeys = recentMinuteKeys(15);
  const redisKeys = minuteKeys.map((b) => `traffic:ip:minute:${ip}:${b}`);
  const vals = redisKeys.length ? await redis.mget(redisKeys) : [];
  const perMinute = minuteKeys.map((b, i) => ({
    minuteKey: b,
    count: Number(vals[i] || 0),
  }));

  const recentFlags = await readFlagsForIp(ip, 200);
  res.json({ ip, perMinute, recentFlags });
}
