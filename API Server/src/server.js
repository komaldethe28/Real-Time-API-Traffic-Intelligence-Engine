/**
 * HTTP + WebSocket server entry with graceful shutdown.
 * @module server
 */
import http from 'node:http';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { getRedis, getSubscriberRedis, shutdownRedis } from './redis/client.js';
import { loadRateLimitScript } from './services/rateLimitService.js';
import { createWebSocketHub } from './websocket/hub.js';
import { startBaselineUpdater, stopBaselineUpdater } from './jobs/baselineUpdater.js';

const app = createApp();
const server = http.createServer(app);

// Warm Redis + preload Lua before opening the subscriber connection (WS hub)
try {
  await getRedis().ping();
  await loadRateLimitScript();
} catch (e) {
  // eslint-disable-next-line no-console
  console.error(
    'Redis is required to start. Start Redis (e.g. docker compose up -d) then retry.',
    e?.message || e,
  );
  process.exit(1);
}

const wss = createWebSocketHub(server);

startBaselineUpdater();

server.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Listening on http://localhost:${config.port} (WS: /ws)`);
  if (!config.wsToken) {
    // eslint-disable-next-line no-console
    console.warn(
      'WS_TOKEN is not set. WebSocket connections will be rejected until configured.',
    );
  }
});

function shutdown(signal) {
  return async () => {
    // eslint-disable-next-line no-console
    console.log(`Shutting down (${signal})...`);
    stopBaselineUpdater();
    wss.close();
    server.close(async () => {
      try {
        await shutdownRedis();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Redis shutdown error', e);
      }
      process.exit(0);
    });
  };
}

process.on('SIGINT', shutdown('SIGINT'));
process.on('SIGTERM', shutdown('SIGTERM'));

// Eager-connect subscriber for WebSocket Pub/Sub fan-out
getSubscriberRedis();
