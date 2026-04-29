/**
 * Normalize HTTP route identity for Redis keys (bounded cardinality).
 * Prefers Express route path when available; otherwise caps raw path depth/length.
 * @module utils/endpointKey
 */

const MAX_SEGMENTS = 6;
const MAX_LEN = 120;

/**
 * @param {import('express').Request} req
 * @returns {string}
 */
export function buildEndpointKey(req) {
  const method = String(req.method || 'GET').toUpperCase();
  const routePath =
    req.route && typeof req.route.path === 'string' ? req.route.path : null;
  const raw = routePath || req.path || req.url?.split('?')[0] || '/';
  const normalized = normalizePath(raw);
  return `${method}:${normalized}`;
}

/**
 * Collapse repeated slashes, trim length, cap folder depth.
 * @param {string} path
 * @returns {string}
 */
function normalizePath(path) {
  let p = String(path).replace(/\/+/g, '/');
  if (!p.startsWith('/')) p = `/${p}`;
  const parts = p.split('/').filter(Boolean).slice(0, MAX_SEGMENTS);
  let out = parts.length ? `/${parts.join('/')}` : '/';
  if (out.length > MAX_LEN) out = out.slice(0, MAX_LEN);
  return out;
}
