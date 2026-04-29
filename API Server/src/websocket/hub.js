/**
 * WebSocket hub: authenticates clients and fans out Redis Pub/Sub messages.
 * @module websocket/hub
 */
import { WebSocketServer } from 'ws';
import { config } from '../config/index.js';
import { getSubscriberRedis } from '../redis/client.js';

/**
 * Attach a WS server on `/ws` and subscribe to intelligence Pub/Sub.
 * @param {import('node:http').Server} server
 * @returns {import('ws').WebSocketServer}
 */
export function createWebSocketHub(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Fail closed: if WS auth is not configured, do not accept any connections.
    // This mirrors the admin API behavior (admin routes return 503 if missing key).
    if (!config.wsToken) {
      ws.close(1011, 'ws_not_configured');
      return;
    }

    try {
      const url = new URL(req.url || '/', 'http://localhost');
      const token = url.searchParams.get('token') || '';
      if (token !== config.wsToken) {
        ws.close(1008, 'unauthorized');
        return;
      }
    } catch {
      ws.close(1008, 'invalid_url');
      return;
    }

    ws.send(JSON.stringify({ type: 'hello', payload: { ok: true } }));
  });

  const sub = getSubscriberRedis();
  sub.subscribe(config.intelligenceChannel, (err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to subscribe intelligence channel', err);
    }
  });

  sub.on('message', (_channel, message) => {
    const text = message.toString();
    for (const client of wss.clients) {
      if (client.readyState === 1) {
        client.send(text);
      }
    }
  });

  return wss;
}
