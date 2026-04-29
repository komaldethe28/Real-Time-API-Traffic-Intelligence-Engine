/**
 * Paths excluded from security/metering middleware (health, admin, WS upgrade).
 * @module utils/bypassPaths
 */

/**
 * @param {string} path
 * @returns {boolean}
 */
export function isOpsBypassPath(path) {
  if (path === '/ws' || path.startsWith('/ws')) return true;
  if (path === '/api/v1/health') return true;
  if (path.startsWith('/api/v1/admin')) return true;
  return false;
}
