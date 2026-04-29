/**
 * Sliding-window rate limiting via Redis ZSET + Lua (atomic trim + add + count).
 * @module services/rateLimitService
 */
import { getRedis } from '../redis/client.js';

const LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
local minScore = now - windowMs

redis.call('ZREMRANGEBYSCORE', key, '-inf', minScore)
redis.call('ZADD', key, now, member)
local count = redis.call('ZCARD', key)
redis.call('PEXPIRE', key, windowMs + 5000)

if count > limit then
  redis.call('ZREM', key, member)
  return {0, count - 1}
end
return {1, count}
`;

/** @type {string | null} */
let sha = null;

/**
 * Load Lua script once and cache SHA for EVALSHA.
 * @returns {Promise<void>}
 */
export async function loadRateLimitScript() {
  const redis = getRedis();
  sha = await redis.script('LOAD', LUA);
}

/**
 * Attempt to consume one token in the sliding window.
 * @param {{ key: string, windowMs: number, limit: number }} params
 * @returns {Promise<{ allowed: boolean, count: number }>}
 */
export async function consumeSlidingWindowToken({ key, windowMs, limit }) {
  const redis = getRedis();
  if (!sha) await loadRateLimitScript();

  const now = Date.now();
  const member = `${now}:${Math.random().toString(36).slice(2)}`;

  try {
    const res = await redis.evalsha(sha, 1, key, now, windowMs, limit, member);
    const allowed = Number(res[0]) === 1;
    const count = Number(res[1] || 0);
    return { allowed, count };
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes('NOSCRIPT')) {
      sha = null;
      await loadRateLimitScript();
      return consumeSlidingWindowToken({ key, windowMs, limit });
    }
    throw e;
  }
}
