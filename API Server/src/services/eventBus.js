/**
 * Redis Pub/Sub bridge for real-time intelligence events (WebSocket fan-out).
 * @module services/eventBus
 */
import { getRedis } from '../redis/client.js';
import { config } from '../config/index.js';

/**
 * Publish a JSON event to the intelligence channel.
 * @param {{ type: string, payload: Record<string, unknown> }} evt
 * @returns {Promise<number>} subscriber count
 */
export async function publishIntelligence(evt) {
  const redis = getRedis();
  const msg = JSON.stringify(evt);
  return redis.publish(config.intelligenceChannel, msg);
}
