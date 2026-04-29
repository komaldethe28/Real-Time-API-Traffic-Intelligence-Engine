/**
 * IP blocklist + soft throttle keys in Redis (TTL-first for auto-expiry).
 * Uses SET for O(1) lookups and SCAN-free enumeration.
 * @module services/blocklistService
 */
import { getRedis } from '../redis/client.js';

const BLOCKED_IPS_SET = 'blocked:ips:set';

/**
 * @param {string} ip
 * @returns {Promise<boolean>}
 */
export async function isBlocked(ip) {
  const redis = getRedis();
  // O(1) lookup using SET
  const exists = await redis.sismember(BLOCKED_IPS_SET, ip);
  if (!exists) return false;
  // Verify TTL hasn't expired (key may exist in SET but STRING key is gone)
  const v = await redis.get(`block:ip:${ip}`);
  if (!v) {
    // Clean up stale SET entry
    await redis.srem(BLOCKED_IPS_SET, ip);
    return false;
  }
  return true;
}

/**
 * @param {string} ip
 * @returns {Promise<boolean>}
 */
export async function isThrottled(ip) {
  const redis = getRedis();
  const v = await redis.get(`throttle:ip:${ip}`);
  return Boolean(v);
}

/**
 * Hard block an IP with TTL seconds.
 * @param {string} ip
 * @param {number} ttlSec
 * @param {string} [reason]
 * @returns {Promise<void>}
 */
export async function blockIp(ip, ttlSec, reason = 'policy') {
  const redis = getRedis();
  const pipe = redis.multi();
  pipe.set(`block:ip:${ip}`, reason, 'EX', Math.max(1, ttlSec));
  pipe.sadd(BLOCKED_IPS_SET, ip);
  await pipe.exec();
}

/**
 * Remove a hard block.
 * @param {string} ip
 * @returns {Promise<number>} number of keys removed
 */
export async function unblockIp(ip) {
  const redis = getRedis();
  const pipe = redis.multi();
  pipe.del(`block:ip:${ip}`);
  pipe.srem(BLOCKED_IPS_SET, ip);
  const results = await pipe.exec();
  return results?.[0]?.[1] || 0;
}

/**
 * Apply soft throttle flag for a short period.
 * @param {string} ip
 * @param {number} ttlSec
 * @returns {Promise<void>}
 */
export async function throttleIp(ip, ttlSec) {
  const redis = getRedis();
  await redis.set(`throttle:ip:${ip}`, '1', 'EX', Math.max(1, ttlSec));
}

/**
 * List currently blocked IPs using SET (O(n) but no SCAN).
 * @param {number} [count]
 * @returns {Promise<Array<{ ip: string, reason: string }>>}
 */
export async function listBlockedIps(count = 200) {
  const redis = getRedis();
  // Use SET members - O(n) but no SCAN overhead
  const ips = await redis.smembers(BLOCKED_IPS_SET);
  const limited = ips.slice(0, count);
  
  if (limited.length === 0) return [];
  
  // Batch fetch reasons
  const keys = limited.map(ip => `block:ip:${ip}`);
  const reasons = await redis.mget(keys);
  
  return limited.map((ip, i) => ({
    ip,
    reason: reasons[i] || 'unknown'
  }));
}

// ============ IP Reputation Persistence ============

const REPUTATION_KEY = 'ip:reputation';
const REPUTATION_EXPIRY_DAYS = 30;

/**
 * Record a block event for reputation tracking (repeat offender detection).
 * @param {string} ip
 * @returns {Promise<void>}
 */
export async function recordBlockEvent(ip) {
  const redis = getRedis();
  const key = `rep:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, REPUTATION_EXPIRY_DAYS * 24 * 3600);
  }
}

/**
 * Get IP reputation score (number of historical blocks).
 * @param {string} ip
 * @returns {Promise<number>}
 */
export async function getIpReputation(ip) {
  const redis = getRedis();
  const v = await redis.get(`rep:${ip}`);
  return Number(v || 0);
}

/**
 * Get IPs with highest reputation (persistent ban candidates).
 * @param {number} [limit]
 * @returns {Promise<Array<{ ip: string, score: number }>>}
 */
export async function getTopReputedIps(limit = 50) {
  const redis = getRedis();
  const pattern = 'rep:*';
  const out = [];
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 50);
    cursor = next;
    for (const k of keys) {
      const ip = k.replace('rep:', '');
      const score = await redis.get(k);
      out.push({ ip, score: Number(score || 0) });
    }
  } while (cursor !== '0' && out.length < limit * 2);
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Permanently ban an IP (no TTL - for repeat offenders).
 * @param {string} ip
 * @param {string} [reason]
 * @returns {Promise<void>}
 */
export async function permanentBanIp(ip, reason = 'persistent_abuse') {
  const redis = getRedis();
  const pipe = redis.multi();
  // No EX option = permanent
  pipe.set(`block:ip:${ip}`, reason);
  pipe.sadd(BLOCKED_IPS_SET, ip);
  pipe.set(`rep:${ip}`, '999', 'EX', REPUTATION_EXPIRY_DAYS * 24 * 3600);
  await pipe.exec();
}

/**
 * Check if IP should be permanently banned based on reputation.
 * @param {string} ip
 * @param {number} threshold
 * @returns {Promise<boolean>}
 */
export async function shouldPermanentBan(ip, threshold = 3) {
  const score = await getIpReputation(ip);
  return score >= threshold;
}
