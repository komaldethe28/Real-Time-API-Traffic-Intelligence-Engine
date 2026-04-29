# API Traffic Intelligence Engine

## Project Title & Hook

**API Traffic Intelligence Engine** — A real-time, full-stack API traffic analysis and protection system. It combines a high-performance Node.js/Express backend with a React-based dashboard to detect, block, and analyze abusive or anomalous API usage patterns at scale. Designed for security teams and platform engineers who need actionable visibility into API traffic while defending against modern threats like scraping, brute-force, and DDoS attacks.

---

## Conceptual Background

Modern APIs are the backbone of digital services, but they are also prime targets for abuse. Traditional rate limiting and static blocklists fail against sophisticated, distributed, or low-and-slow attacks. This project addresses that gap by combining:

| Concept | Implementation |
|---------|----------------|
| **Sliding Window Rate Limiting** | Redis ZSET + Lua script for atomic, precise request throttling |
| **Heuristic Anomaly Detection** | Real-time detection of traffic spikes, endpoint hammering, and path scanning |
| **Event-Driven Architecture** | Redis Pub/Sub + WebSocket for sub-second alert propagation |
| **Time-Series Analytics** | Per-minute rollups using Redis ZSETs for top IPs/endpoints |
| **Audit Trail** | Redis Streams for immutable, queryable flag logs |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         React Dashboard                              │    │
│  │   Dashboard │ Alerts │ IP Detail │ Real-time charts (Recharts)      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │ WebSocket + REST
┌────────────────────────────────────▼────────────────────────────────────────┐
│                         API SERVER (Node.js/Express)                        │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Middleware │  │ Controllers  │  │   Services   │  │   WebSocket  │    │
│  │              │  │              │  │              │  │     Hub      │    │
│  │ • blocklist  │  │ • analytics  │  │ • anomaly    │  │              │    │
│  │ • rateLimit  │  │ • admin      │  │ • traffic    │  │ • subscribe  │    │
│  │ • traffic    │  │              │  │ • blocklist  │  │ • broadcast  │    │
│  │ • throttle   │  │              │  │ • audit      │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │ Redis Client + Pub/Sub
┌────────────────────────────────────▼────────────────────────────────────────┐
│                            REDIS (State & Events)                           │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   ZSETs     │  │   STRINGs   │  │    SET      │  │   STREAM    │        │
│  │             │  │             │  │             │  │             │        │
│  │ traffic:*   │  │ block:ip:*  │  │blocked:ips  │  │ flags:stream│        │
│  │ ep:win:*    │  │ throttle:*  │  │             │  │             │        │
│  │ scan:paths* │  │ baseline:   │  │             │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Architecture

### Backend (API Server)

```
API Server/
├── src/
│   ├── app.js                 # Express app factory, middleware orchestration
│   ├── server.js              # HTTP server entry point
│   ├── config/index.js        # Environment-driven configuration
│   ├── middleware/
│   │   ├── blocklist.js       # Early 403 for blocked IPs (O(1) SET lookup)
│   │   ├── rateLimitSlidingWindow.js   # Global sliding window limiter
│   │   ├── rateLimitEndpoint.js        # Per-endpoint stricter limits
│   │   ├── rateLimitAdmin.js           # Admin API rate limiting
│   │   ├── trafficCapture.js  # Async request telemetry + anomaly trigger
│   │   ├── throttle.js        # Soft throttle for flagged IPs
│   │   └── requireAdmin.js    # API key protection
│   ├── services/
│   │   ├── trafficService.js  # Per-IP/endpoint counters, ZSET rollups
│   │   ├── anomalyService.js  # Heuristic detection (spike/hammer/scan)
│   │   ├── blocklistService.js # Block/throttle with IP reputation tracking
│   │   ├── rateLimitService.js # Lua script for atomic sliding window
│   │   ├── auditService.js    # Redis Stream append-only log
│   │   └── eventBus.js        # Redis Pub/Sub publisher
│   ├── controllers/
│   │   ├── analyticsController.js  # /analytics/overview, /flags, /ip/:ip
│   │   └── adminController.js      # /admin/unblock
│   ├── routes/
│   │   ├── analyticsRoutes.js
│   │   └── adminRoutes.js
│   ├── websocket/hub.js       # WebSocket server with token auth
│   ├── redis/client.js        # Redis client + subscriber instance
│   └── utils/
│       ├── ip.js              # IP extraction with IPv6 normalization
│       ├── endpointKey.js     # Normalized endpoint identifiers
│       └── bypassPaths.js     # Ops paths excluded from protection
```

### Frontend (UI)

```
UI/
├── src/
│   ├── App.jsx                # Router + layout
│   ├── pages/
│   │   ├── Dashboard.jsx      # KPI cards, traffic line chart, top IPs bar
│   │   ├── Alerts.jsx         # Flagged events list with reason badges
│   │   └── IpDetail.jsx       # Per-IP traffic history + flags
│   ├── components/
│   │   ├── TrafficLineChart.jsx    # Recharts line chart (minute rollups)
│   │   ├── TopIpsBarChart.jsx      # Recharts bar chart (top 8 IPs)
│   │   ├── StatCard.jsx            # KPI display component
│   │   ├── ReasonBadge.jsx         # Color-coded anomaly reasons
│   │   └── AppShell.jsx            # Layout shell with sidebar
│   ├── services/
│   │   ├── api.js             # Axios instance + fetchOverview/fetchFlags/fetchIp
│   │   └── socket.js          # WebSocket singleton with exponential backoff
│   ├── hooks/
│   │   ├── useApi.js          # Polling wrapper (configurable interval)
│   │   └── useSocket.js       # Event subscription hook
│   └── utils/format.js        # Number formatting, minute key → label
```

### Data Flow

```
Client Request
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Middleware Chain (app.js)                                      │
│  1. blocklistMiddleware    → 403 if IP in blocked:ips SET      │
│  2. trafficCapture        → recordRequest() → evaluateAndAct() │
│  3. softThrottleMiddleware→ 429 if IP in throttle:ip:* STRING  │
│  4. rateLimitSlidingWindow→ Lua atomic check → 429 if exceeded │
│  5. rateLimitEndpoint      → stricter per-endpoint limit       │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Traffic Service (trafficService.js)                           │
│  • INCR traffic:total:minute:{bucket}                          │
│  • ZINCRBY traffic:topips:minute:{bucket} 1 ip                │
│  • ZINCRBY traffic:topendpoints:minute:{bucket} 1 endpoint    │
│  • ZADD ep:win:{ip}:{endpoint} (sliding window for hammer)     │
│  • ZADD scan:paths:{ip} (unique path tracking for scan)        │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Anomaly Service (anomalyService.js)                           │
│  • GET traffic:ip:minute:{ip}:{bucket} → minuteCount           │
│  • GET baseline:ema:{ip} → EMA baseline                        │
│  • ZCOUNT ep:win → hammerCount                                 │
│  • ZCOUNT scan:paths → scanCount                               │
│  │                                                              │
│  │ Heuristics:                                                 │
│  │   if minuteCount > baseline * spikeRatio → SPIKE_TRAFFIC   │
│  │   if hammerCount > threshold        → ENDPOINT_HAMMER      │
│  │   if scanCount > threshold          → SCAN_PATTERN         │
│  │                                                              │
│  │ Actions:                                                    │
│  │   hard (spike/scan) → blockIp() + recordBlockEvent()       │
│  │   soft (hammer)     → throttleIp()                         │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Audit & Event Bus                                             │
│  • XADD flags:stream → immutable flag record                   │
│  • PUBLISH traffic:intelligence → real-time event              │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Analytics + WebSocket                                         │
│  • REST: /analytics/overview, /flags, /ip/:ip                  │
│  • WS: /ws?token=... → broadcast all events to clients         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Deep Dive

### 1. Sliding Window Rate Limiting (Redis + Lua)

**Why Lua?** Rate limiting requires atomic read-modify-write. Without Lua, a naive `ZADD` + `ZCARD` + `ZREM` sequence creates a race window where concurrent requests could bypass the limit.

```js
// src/services/rateLimitService.js
const LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
local minScore = now - windowMs

-- Atomic sliding window: trim, add, count, expire
redis.call('ZREMRANGEBYSCORE', key, '-inf', minScore)
redis.call('ZADD', key, now, member)
local count = redis.call('ZCARD', key)
redis.call('PEXPIRE', key, windowMs + 5000)

if count > limit then
  redis.call('ZREM', key, member)
  return {0, count - 1}
end
return {1, count}
`;
```

**Design Decision:** The Lua script uses a unique member (`now:random`) per request to handle concurrent requests correctly. The window slides dynamically — older timestamps are trimmed automatically.

---

### 2. Anomaly Detection Heuristics

**Why three heuristics?** Each targets a different attack vector:

| Heuristic | Trigger | Attack Type |
|-----------|---------|-------------|
| `SPIKE_TRAFFIC` | `minuteCount > baseline * spikeRatio` | Volumetric DDoS, traffic spike |
| `ENDPOINT_HAMMER` | `ZCOUNT(ep:win:{ip}:{endpoint}) > threshold` | API endpoint brute-force |
| `SCAN_PATTERN` | `ZCOUNT(scan:paths:{ip}) > threshold` | Path traversal, enumeration |

```js
// src/services/anomalyService.js
export async function evaluateAndAct(ctx) {
  const { ip, endpointKey, path } = ctx;
  const now = Date.now();

  const [minuteCount, baselineStr, hammerCount, scanCount] = await Promise.all([
    getIpMinuteCount(ip),
    redis.get(`baseline:ema:${ip}`),
    redis.zcount(`ep:win:${ip}:${endpointKey}`, now - config.anomaly.endpointHammerWindowMs, '+inf'),
    redis.zcount(`scan:paths:${ip}`, now - config.anomaly.scanWindowMs, '+inf'),
  ]);

  const baseline = Number(baselineStr || 0);
  const reasons = [];

  // Spike detection with EMA baseline
  const spikeFloor = Math.max(config.anomaly.spikeMinBaseline, baseline || 0);
  if (baseline > 0 && minuteCount > spikeFloor * config.anomaly.spikeRatio) {
    reasons.push('SPIKE_TRAFFIC');
  }

  // Endpoint hammering
  if (hammerCount > config.anomaly.endpointHammerThreshold) {
    reasons.push('ENDPOINT_HAMMER');
  }

  // Path scanning
  if (scanCount > config.anomaly.scanUniquePathsThreshold) {
    reasons.push('SCAN_PATTERN');
  }

  // EMA baseline update (reduces false positives over time)
  if (!reasons.includes('SPIKE_TRAFFIC')) {
    const alpha = 0.25;
    const nextEma = baseline === 0 ? minuteCount : alpha * minuteCount + (1 - alpha) * baseline;
    await redis.set(`baseline:ema:${ip}`, String(nextEma), 'EX', 7 * 24 * 3600);
  }

  if (reasons.length === 0) return;

  // Progressive response
  const hard = reasons.includes('SPIKE_TRAFFIC') || reasons.includes('SCAN_PATTERN');
  if (hard) {
    const permanent = await shouldPermanentBan(ip, 3);
    if (permanent) {
      await permanentBanIp(ip, reasons.join(','));
    } else {
      await blockIp(ip, config.autoBlockTtlSec, reasons.join(','));
      await recordBlockEvent(ip); // Track for repeat offender escalation
    }
  } else {
    await throttleIp(ip, config.autoThrottleTtlSec);
  }
}
```

**Design Decision:** The EMA baseline smooths traffic variation, reducing false positives. IP reputation tracking escalates repeat offenders to permanent bans.

---

### 3. O(1) Blocklist Lookup

**Why SET instead of SCAN?** A naive `SCAN 'block:ip:*'` is O(n) and blocks the Redis event loop under high block volume. Using a SET for membership + STRING for TTL achieves O(1) lookups.

```js
// src/services/blocklistService.js
const BLOCKED_IPS_SET = 'blocked:ips:set';

export async function isBlocked(ip) {
  const exists = await redis.sismember(BLOCKED_IPS_SET, ip); // O(1)
  if (!exists) return false;
  const v = await redis.get(`block:ip:${ip}`); // Verify TTL
  if (!v) {
    await redis.srem(BLOCKED_IPS_SET, ip); // Cleanup stale entry
    return false;
  }
  return true;
}

export async function blockIp(ip, ttlSec, reason) {
  const pipe = redis.multi();
  pipe.set(`block:ip:${ip}`, reason, 'EX', Math.max(1, ttlSec));
  pipe.sadd(BLOCKED_IPS_SET, ip);
  await pipe.exec();
}
```

---

### How API blocking works

The backend uses a fast Redis-backed blocklist to deny requests immediately when an IP is flagged.

- `blocklistMiddleware` runs first for every request.
- It checks `blocked:ips:set` for O(1) membership using `SISMEMBER`.
- If the IP is present, it confirms the TTL-backed `block:ip:{ip}` string still exists.
- If the block is valid, the request is aborted with `403 { error: 'blocked', ip }`.
- If the `block:ip:{ip}` key expired, the stale set entry is cleaned up automatically.

Blocking is triggered by anomaly detection in `anomalyService.js`:

- `SPIKE_TRAFFIC` and `SCAN_PATTERN` cause a hard block.
- `ENDPOINT_HAMMER` causes a soft throttle instead.
- Hard blocks use `blockIp(ip, ttlSec, reason)` and add the IP to `blocked:ips:set`.
- Repeat offenders can become permanent bans when reputation exceeds the configured threshold.

This design keeps block enforcement fast and reliable while still allowing automatic removal when the TTL expires.

---

### 4. Real-Time WebSocket with Exponential Backoff

**Why exponential backoff?** Network partitions and Redis Pub/Sub disconnects are transient. Immediate reconnect storms amplify the problem.

```js
// src/services/socket.js (UI side)
class SocketManager {
  _connect() {
    this.ws = new WebSocket(url);
    this.ws.onclose = () => {
      this.ws = null;
      this._scheduleReconnect();
    };
  }

  _scheduleReconnect() {
    if (!this.shouldRun) return;
    const delay = Math.min(1000 * Math.pow(2, this.retry), this.maxDelay);
    this.retry++;
    this.timer = setTimeout(() => this._connect(), delay);
  }
}
```

---

### 5. Redis Data Structures

| Key Pattern | Type | Purpose | TTL |
|-------------|------|---------|-----|
| `traffic:total:minute:{bucket}` | STRING | Minute total request count | 48h |
| `traffic:topips:minute:{bucket}` | ZSET | Top IPs by count (sorted) | 48h |
| `traffic:topendpoints:minute:{bucket}` | ZSET | Top endpoints by count | 48h |
| `traffic:ip:minute:{ip}:{bucket}` | STRING | Per-IP minute count | 48h |
| `ep:win:{ip}:{endpoint}` | ZSET | Sliding window for hammer detection | 180s |
| `scan:paths:{ip}` | ZSET | Unique paths in sliding window | 360s |
| `block:ip:{ip}` | STRING | Blocked IP + reason | TTL-based |
| `blocked:ips:set` | SET | O(1) membership check | None |
| `throttle:ip:{ip}` | STRING | Soft throttle flag | TTL-based |
| `baseline:ema:{ip}` | STRING | EMA traffic baseline | 7 days |
| `flags:stream` | STREAM | Immutable audit log | None |
| `traffic:intelligence` | Pub/Sub | Real-time event channel | None |

---

## The User Journey

### Scenario: Malicious client attempts endpoint hammering on `/api/auth/login`

```
1. Client sends POST /api/auth/login (attempt #1)
   │
   ▼
2. blocklistMiddleware → IP not in blocked:ips:set → PASS
   │
   ▼
3. trafficCapture → recordRequest()
   • ZINCRBY traffic:topips:minute:202604221530 1 192.168.1.100
   • ZADD ep:win:192.168.1.100:POST:/api/auth/login 1745322200001:abc123
   │
   ▼
4. evaluateAndAct() (async)
   • ZCOUNT ep:win:192.168.1.100:POST:/api/auth/login (now-60s, +inf) = 1
   • 1 < threshold (80) → NO ACTION
   │
   ▼
5. rateLimitSlidingWindow → allowed (120/min limit)
   │
   ▼
6. Response 200 OK

... (client sends 85 more requests in 60 seconds) ...

   │
   ▼
7. evaluateAndAct() → ZCOUNT = 85 > 80 → ENDPOINT_HAMMER
   │
   ▼
8. throttleIp(ip, 120) → SET throttle:ip:192.168.1.100 1 EX 120
   │
   ▼
9. appendFlag() → XADD flags:stream * ts:... ip:... reasons:["ENDPOINT_HAMMER"] ...
   │
   ▼
10. publishIntelligence() → PUBLISH traffic:intelligence {type:"throttle", ...}
   │
   ▼
11. WebSocket clients receive:
    { type: "throttle", payload: { ip: "192.168.1.100", reasons: ["ENDPOINT_HAMMER"], ... } }
   │
   ▼
12. Dashboard updates: Alerts panel shows new flag, throttle count increments
```

---

## Getting Started

### Prerequisites

| Component | Version | Purpose |
|-----------|---------|---------|
| Node.js | 18+ | Runtime |
| Redis | 7+ | State + Pub/Sub |
| Bun | 1.x | Frontend build (optional, Vite works with npm) |

### Backend Setup

```sh
# Clone and navigate
$ git clone https://github.com/komaldethe2803/API-Traffic-Intelligence-Engine.git
$ cd API-Traffic-Intelligence-Engine/API Server

# Install dependencies
$ npm install

# Start Redis
$ docker run -d -p 6379:6379 redis:7-alpine

# Configure (edit .env)
# Start the server
$ npm start
```

### Frontend Setup

```sh
$ cd ../UI

# Install dependencies
$ bun install   # or npm install

# Configure (edit .env)
$ cp .env .env.example
$ # Set VITE_API_BASE_URL and VITE_WS_TOKEN to match backend

# Start dev server
$ bun dev       # or npm run dev
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | API server port |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis connection |
| `RATE_LIMIT_WINDOW_MS` | 60000 | Sliding window size |
| `RATE_LIMIT_MAX` | 120 | Requests per window |
| `SPIKE_RATIO` | 5 | Spike detection multiplier |
| `ENDPOINT_HAMMER_THRESHOLD` | 80 | Requests per endpoint in window |
| `SCAN_UNIQUE_PATHS_THRESHOLD` | 40 | Unique paths in window |
| `AUTO_BLOCK_TTL_SEC` | 900 | Auto-block duration |
| `AUTO_THROTTLE_TTL_SEC` | 120 | Auto-throttle duration |
| `ADMIN_API_KEY` | (required) | Admin endpoint protection |
| `WS_TOKEN` | (required) | WebSocket authentication |
| `ENDPOINT_RATE_LIMITS` | `{}` | JSON: `{"/path": limit}` |

---

## Usage / Output

### REST API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/analytics/overview` | Traffic stats, top IPs, top endpoints, blocked sample |
| `GET /api/v1/analytics/flags` | Recent anomaly flags (paginated) |
| `GET /api/v1/analytics/ip/:ip` | Per-IP traffic history + flags |
| `POST /admin/unblock` | Unblock an IP (requires `x-admin-key` header) |
| `GET /api/v1/health` | Health check with Redis ping |

### WebSocket Events

| Event Type | Payload |
|------------|---------|
| `block` | `{ ip, reasons, endpointKey, path, meta }` |
| `throttle` | `{ ip, reasons, endpointKey, path, meta }` |
| `flag` | `{ ip, reasons, endpointKey, path, meta }` |
| `permanent_ban` | `{ ip, reasons, endpointKey, path, meta }` |
| `admin_unblock` | `{ ip, removed, ts }` |

### Sample API Response

```json
// GET /api/v1/analytics/overview
{
  "minutes": ["202604221530", "202604221531", "202604221532"],
  "rollups": [
    { "total": 142, "topIps": [{"ip": "192.168.1.100", "count": 89}], "topEndpoints": [...] },
    { "total": 156, "topIps": [{"ip": "192.168.1.100", "count": 95}], "topEndpoints": [...] },
    { "total": 163, "topIps": [{"ip": "10.0.0.5", "count": 110}], "topEndpoints": [...] }
  ],
  "currentMinuteKey": "202604221533",
  "blockedSample": [
    { "ip": "203.0.113.50", "reason": "SPIKE_TRAFFIC" },
    { "ip": "198.51.100.22", "reason": "SCAN_PATTERN" }
  ]
}
```

---

## Extensibility

| Feature | Description | Implementation Hint |
|---------|-------------|---------------------|
| **ML-based anomaly scoring** | Replace heuristic thresholds with isolation forest or ONNX runtime | Add `anomalyService.mlScore()` → block if score > 0.8 |
| **Persistent ban list** | Admin UI to mark IPs as permanently blocked | Add `permanent:blocked` SET, bypass expiry |
| **Request body hashing** | Log SHA-256 of request body for forensics | `crypto.createHash('sha256').update(body).digest()` |
| **Distributed Redis** | Redis Cluster for horizontal scaling | Use `ioredis` cluster mode, key hashtags for sharding |
| **Rate limit by user token** | Token-based rate limiting alongside IP | Add `rl:token:{token}` ZSET in rateLimitService |

---

## Summary

This project demonstrates end-to-end engineering of a production-grade API protection system:

- **System Design:** Modular architecture with clear separation between middleware, services, controllers, and real-time components
- **Performance Optimization:** O(1) blocklist lookups, atomic Lua scripts for rate limiting, efficient Redis data structures
- **Real-Time Engineering:** WebSocket with exponential backoff, Redis Pub/Sub for event propagation, sub-second dashboard updates
- **Security:** API key authentication, token-based WebSocket auth, progressive response (throttle → block → permanent ban)
- **Observability:** Redis Streams for audit logs, structured JSON error logging, health endpoints

The architecture is ready for deployment behind a reverse proxy, with horizontal scaling possible via Redis Cluster.
