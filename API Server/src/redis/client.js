/**
 * Redis connections: one command client + one dedicated subscriber (Pub/Sub).
 * ioredis requires a separate connection for SUBSCRIBE mode.
 * @module redis/client
 */
import Redis from 'ioredis';
import { config } from '../config/index.js';

/** @type {Redis | null} */
let commandClient = null;
/** @type {Redis | null} */
let subscriberClient = null;

/**
 * Lazily create the primary Redis client used for commands (rate limits, streams, etc.).
 * @returns {Redis}
 */
export function getRedis() {
  if (!commandClient) {
    commandClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    });
    commandClient.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('[redis] command client error:', err.message);
    });
  }
  return commandClient;
}

/**
 * Dedicated subscriber connection (must not be used for normal commands).
 * @returns {Redis}
 */
export function getSubscriberRedis() {
  if (!subscriberClient) {
    subscriberClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
    subscriberClient.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('[redis] subscriber error:', err.message);
    });
  }
  return subscriberClient;
}

/**
 * Close all Redis connections gracefully.
 * @returns {Promise<void>}
 */
export async function shutdownRedis() {
  const tasks = [];
  if (commandClient) {
    tasks.push(commandClient.quit().catch(() => commandClient?.disconnect()));
    commandClient = null;
  }
  if (subscriberClient) {
    tasks.push(subscriberClient.quit().catch(() => subscriberClient?.disconnect()));
    subscriberClient = null;
  }
  await Promise.all(tasks);
}
