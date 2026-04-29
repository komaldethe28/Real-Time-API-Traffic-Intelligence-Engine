/**
 * Redis-backed traffic counters and per-window structures for analytics + anomaly inputs.
 * @module services/trafficService
 */
import { getRedis } from '../redis/client.js';

/**
 * UTC minute key used for rollups (yyyyMMddHHmm).
 * @param {number} [ts]
 * @returns {string}
 */
export function utcMinuteKey(ts = Date.now()) {
  const d = new Date(ts);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${y}${m}${day}${h}${min}`;
}

/**
 * Record a single request for rollups and anomaly windows (best-effort).
 * @param {{ ip: string, endpointKey: string, path: string }} input
 * @returns {Promise<void>}
 */
export async function recordRequest({ ip, endpointKey, path }) {
  const redis = getRedis();
  const bucket = utcMinuteKey();
  const pipe = redis.multi();

  pipe.incr(`traffic:total:minute:${bucket}`);
  pipe.expire(`traffic:total:minute:${bucket}`, 48 * 3600);

  pipe.zincrby(`traffic:topips:minute:${bucket}`, 1, ip);
  pipe.expire(`traffic:topips:minute:${bucket}`, 48 * 3600);

  pipe.zincrby(`traffic:topendpoints:minute:${bucket}`, 1, endpointKey);
  pipe.expire(`traffic:topendpoints:minute:${bucket}`, 48 * 3600);

  pipe.incr(`traffic:ip:minute:${ip}:${bucket}`);
  pipe.expire(`traffic:ip:minute:${ip}:${bucket}`, 48 * 3600);

  const now = Date.now();
  const member = `${now}:${Math.random().toString(36).slice(2)}`;

  // Per-endpoint short window for hammer detection
  pipe.zadd(`ep:win:${ip}:${endpointKey}`, now, member);
  pipe.zremrangebyscore(`ep:win:${ip}:${endpointKey}`, 0, now - 120_000);
  pipe.expire(`ep:win:${ip}:${endpointKey}`, 180);

  // Unique path proxy in sliding window (scanner heuristic)
  const pathKey = path.slice(0, 160);
  pipe.zadd(`scan:paths:${ip}`, now, pathKey);
  pipe.zremrangebyscore(`scan:paths:${ip}`, 0, now - 300_000);
  pipe.expire(`scan:paths:${ip}`, 360);

  try {
    await pipe.exec();
  } catch {
    // Intentionally swallow: capture must not take down requests
  }
}

/**
 * Current per-IP minute counter (UTC minute bucket).
 * @param {string} ip
 * @returns {Promise<number>}
 */
export async function getIpMinuteCount(ip) {
  const redis = getRedis();
  const bucket = utcMinuteKey();
  const v = await redis.get(`traffic:ip:minute:${ip}:${bucket}`);
  return Number(v || 0);
}

/**
 * @param {string} minuteKey yyyyMMddHHmm
 * @returns {Promise<{ total: number, topIps: Array<{ ip: string, count: number }>, topEndpoints: Array<{ endpoint: string, count: number }> }>}
 */
export async function getMinuteRollup(minuteKey) {
  const redis = getRedis();
  const [total, ips, eps] = await Promise.all([
    redis.get(`traffic:total:minute:${minuteKey}`),
    redis.zrevrange(`traffic:topips:minute:${minuteKey}`, 0, 9, 'WITHSCORES'),
    redis.zrevrange(`traffic:topendpoints:minute:${minuteKey}`, 0, 9, 'WITHSCORES'),
  ]);
  return {
    total: Number(total || 0),
    topIps: withScores(ips).map(({ member, count }) => ({ ip: member, count })),
    topEndpoints: withScores(eps).map(({ member, count }) => ({
      endpoint: member,
      count,
    })),
  };
}

/**
 * @param {number} lastNMinutes
 * @returns {Promise<string[]>} minute keys oldest->newest
 */
export function recentMinuteKeys(lastNMinutes = 10) {
  const keys = [];
  const now = Date.now();
  for (let i = lastNMinutes - 1; i >= 0; i -= 1) {
    keys.push(utcMinuteKey(now - i * 60_000));
  }
  return keys;
}

function withScores(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i += 2) {
    out.push({ member: arr[i], count: Number(arr[i + 1] || 0) });
  }
  return out;
}
