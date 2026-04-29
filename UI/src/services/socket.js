/**
 * Singleton WebSocket manager with exponential backoff reconnection
 * and a tiny pub/sub for event types.
 */

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3000/ws";
const WS_TOKEN = import.meta.env.VITE_WS_TOKEN || "";

const STATUS = { CONNECTING: "connecting", OPEN: "open", CLOSED: "closed" };

class SocketManager {
  constructor() {
    this.ws = null;
    this.status = STATUS.CLOSED;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.retry = 0;
    this.maxDelay = 15000;
    this.shouldRun = false;
    this.timer = null;
  }

  _setStatus(s) {
    this.status = s;
    this.statusListeners.forEach((cb) => {
      try { cb(s); } catch { /* noop */ }
    });
  }

  start() {
    if (this.shouldRun) return;
    this.shouldRun = true;
    this._connect();
  }

  stop() {
    this.shouldRun = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.ws) {
      try { this.ws.close(); } catch { /* noop */ }
      this.ws = null;
    }
    this._setStatus(STATUS.CLOSED);
  }

  _connect() {
    if (!this.shouldRun) return;
    this._setStatus(STATUS.CONNECTING);

    const url = WS_TOKEN
      ? `${WS_URL}?token=${encodeURIComponent(WS_TOKEN)}`
      : WS_URL;

    let ws;
    try {
      ws = new WebSocket(url);
    } catch {
      this._scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.retry = 0;
      this._setStatus(STATUS.OPEN);
    };

    ws.onmessage = (ev) => {
      let msg = null;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (!msg || !msg.type) return;
      this.listeners.forEach((cb) => {
        try { cb(msg); } catch { /* noop */ }
      });
    };

    ws.onerror = () => { /* onclose will fire */ };

    ws.onclose = () => {
      this.ws = null;
      this._setStatus(STATUS.CLOSED);
      this._scheduleReconnect();
    };
  }

  _scheduleReconnect() {
    if (!this.shouldRun) return;
    const delay = Math.min(this.maxDelay, 500 * Math.pow(2, this.retry));
    this.retry += 1;
    this.timer = setTimeout(() => this._connect(), delay);
  }

  onMessage(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  onStatus(cb) {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }
}

export const socket = new SocketManager();
export const SOCKET_STATUS = STATUS;
