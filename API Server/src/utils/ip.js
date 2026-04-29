/**
 * Client IP extraction with optional reverse-proxy awareness (Express trust proxy).
 * Normalizes IPv6 loopback to IPv4 for consistent analytics.
 * @module utils/ip
 */

/**
 * Normalize IPv6 loopback to IPv4.
 * @param {string} ip
 * @returns {string}
 */
function normalizeIp(ip) {
  if (ip === '::1' || ip === '::' || ip === '127.0.0.1') {
    return '127.0.0.1';
  }
  return ip;
}

/**
 * @param {import('express').Request} req
 * @returns {string}
 */
export function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return normalizeIp(xff.split(',')[0].trim());
  }
  if (req.ip) return normalizeIp(String(req.ip));
  return normalizeIp(req.socket?.remoteAddress || 'unknown');
}