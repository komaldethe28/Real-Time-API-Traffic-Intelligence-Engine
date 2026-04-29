/**
 * Append-only audit trail for flagged traffic using Redis Streams.
 * @module services/auditService
 */
import { getRedis } from '../redis/client.js';

const STREAM_KEY = 'flags:stream';

/**
 * Append a flag event to the stream.
 * @param {{ ip: string, reasons: string[], endpointKey?: string, path?: string, meta?: Record<string, unknown> }} evt
 * @returns {Promise<string|null>} stream entry id
 */
export async function appendFlag(evt) {
  const redis = getRedis();
  const payload = {
    ts: String(Date.now()),
    ip: evt.ip,
    reasons: JSON.stringify(evt.reasons || []),
    endpointKey: evt.endpointKey || '',
    path: evt.path || '',
    meta: JSON.stringify(evt.meta || {}),
  };
  const id = await redis.xadd(STREAM_KEY, '*', ...Object.entries(payload).flat());
  return id;
}

/**
 * Paginated read of recent flag events (newest first via reverse range helper).
 * @param {{ startId: string, count: number }} opts
 * @returns {Promise<Array<{ id: string, ip: string, reasons: string[], endpointKey: string, path: string, ts: number, meta: Record<string, unknown> }>>}
 */
export async function readFlags({ startId = '+', count = 50 } = {}) {
  const redis = getRedis();
  const end = startId === '+' ? '+' : startId;
  const res = await redis.xrevrange(STREAM_KEY, end, '-', 'COUNT', count);
  return res.map(([id, fields]) => parseEntry(id, fields));
}

/**
 * Read flags for a specific IP (scans newest entries; bounded count).
 * @param {string} ip
 * @param {number} [scanCount]
 * @returns {Promise<Array<ReturnType<typeof parseEntry>>>}
 */
export async function readFlagsForIp(ip, scanCount = 500) {
  const all = await readFlags({ startId: '+', count: scanCount });
  return all.filter((x) => x.ip === ip);
}

function parseEntry(id, fields) {
  const map = fieldsArrayToObject(fields);
  let reasons = [];
  try {
    reasons = JSON.parse(map.reasons || '[]');
  } catch {
    reasons = [];
  }
  let meta = {};
  try {
    meta = JSON.parse(map.meta || '{}');
  } catch {
    meta = {};
  }
  return {
    id,
    ip: map.ip || '',
    reasons,
    endpointKey: map.endpointKey || '',
    path: map.path || '',
    ts: Number(map.ts || 0),
    meta,
  };
}

function fieldsArrayToObject(fields) {
  const o = {};
  for (let i = 0; i < fields.length; i += 2) {
    o[fields[i]] = fields[i + 1];
  }
  return o;
}
