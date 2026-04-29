/**
 * Admin operations (unblock, etc.).
 * @module controllers/adminController
 */
import { unblockIp } from '../services/blocklistService.js';
import { publishIntelligence } from '../services/eventBus.js';

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function unblock(req, res) {
  const ip = String(req.body?.ip || '');
  if (!ip) return res.status(400).json({ error: 'missing_ip' });

  const removed = await unblockIp(ip);
  await publishIntelligence({
    type: 'admin_unblock',
    payload: { ip, removed, ts: Date.now() },
  });

  res.json({ ok: true, ip, removed });
}
