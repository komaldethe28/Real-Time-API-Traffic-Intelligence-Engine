/**
 * Rule-based anomaly detection: spikes, endpoint hammering, scan-like path churn.
 * On detection: audit log, auto block/throttle, and publish real-time events.
 * @module services/anomalyService
 *
 * Future: plug ML scoring (isolation forest / ONNX) as an advisory layer before hard blocks.
 */
import { config } from '../config/index.js';
import { getRedis } from '../redis/client.js';
import { getIpMinuteCount } from './trafficService.js';
import { appendFlag } from './auditService.js';
import { blockIp, throttleIp, recordBlockEvent, shouldPermanentBan, permanentBanIp } from './blocklistService.js';
import { publishIntelligence } from './eventBus.js';

/**
 * Evaluate heuristics for a single request context and apply automated responses.
 * @param {{ ip: string, endpointKey: string, path: string }} ctx
 * @returns {Promise<void>}
 */
export async function evaluateAndAct(ctx) {
  const { ip, endpointKey, path } = ctx;
  const redis = getRedis();
  const now = Date.now();

  const [minuteCount, baselineStr, hammerCount, scanCount] = await Promise.all([
    getIpMinuteCount(ip),
    redis.get(`baseline:ema:${ip}`),
    redis.zcount(
      `ep:win:${ip}:${endpointKey}`,
      now - config.anomaly.endpointHammerWindowMs,
      '+inf',
    ),
    redis.zcount(`scan:paths:${ip}`, now - config.anomaly.scanWindowMs, '+inf'),
  ]);

  const baseline = Number(baselineStr || 0);
  const reasons = [];

  const spikeFloor = Math.max(config.anomaly.spikeMinBaseline, baseline || 0);
  if (baseline > 0 && minuteCount > spikeFloor * config.anomaly.spikeRatio) {
    reasons.push('SPIKE_TRAFFIC');
  }

  if (hammerCount > config.anomaly.endpointHammerThreshold) {
    reasons.push('ENDPOINT_HAMMER');
  }

  if (scanCount > config.anomaly.scanUniquePathsThreshold) {
    reasons.push('SCAN_PATTERN');
  }

  // Update EMA baseline slowly when not firing spike (reduces false positives over time)
  if (!reasons.includes('SPIKE_TRAFFIC')) {
    const alpha = 0.25;
    const nextEma =
      baseline === 0 ? minuteCount : alpha * minuteCount + (1 - alpha) * baseline;
    await redis
      .set(`baseline:ema:${ip}`, String(nextEma), 'EX', 7 * 24 * 3600)
      .catch(() => {});
  }

  if (reasons.length === 0) return;

  const meta = { minuteCount, baseline, hammerCount, scanCount };

  await appendFlag({ ip, reasons, endpointKey, path, meta });

  // Progressive response: throttle for hammer-only; block for spike/scan
  const hard = reasons.includes('SPIKE_TRAFFIC') || reasons.includes('SCAN_PATTERN');
  
  if (hard) {
    // Check if IP should be permanently banned based on reputation
    const permanentBan = await shouldPermanentBan(ip, 3);
    
    if (permanentBan) {
      await permanentBanIp(ip, reasons.join(','));
      await publishIntelligence({
        type: 'permanent_ban',
        payload: { ip, reasons, endpointKey, path, meta },
      });
    } else {
      await blockIp(ip, config.autoBlockTtlSec, reasons.join(','));
      await recordBlockEvent(ip); // Track for repeat offender detection
      await publishIntelligence({
        type: 'block',
        payload: { ip, reasons, endpointKey, path, meta },
      });
    }
  } else {
    await throttleIp(ip, config.autoThrottleTtlSec);
    await publishIntelligence({
      type: 'throttle',
      payload: { ip, reasons, endpointKey, path, meta },
    });
  }

  await publishIntelligence({
    type: 'flag',
    payload: { ip, reasons, endpointKey, path, meta },
  });
}
