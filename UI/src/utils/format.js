export const formatNumber = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
};

export const formatTime = (ts) => {
  if (!ts) return "—";
  try {
    const d = new Date(typeof ts === "number" ? ts : Date.parse(ts));
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch { return "—"; }
};

export const formatDateTime = (ts) => {
  if (!ts) return "—";
  try {
    const d = new Date(typeof ts === "number" ? ts : Date.parse(ts));
    return d.toLocaleString();
  } catch { return "—"; }
};

export const minuteKeyToLabel = (key) => {
  if (!key) return "";
  // Accept "YYYY-MM-DDTHH:MM" or epoch-minute strings
  const tryDate = new Date(key);
  if (!Number.isNaN(tryDate.getTime())) {
    return tryDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  // Fallback: last 5 chars
  return String(key).slice(-5);
};

export const CRITICAL_REASONS = new Set(["SPIKE_TRAFFIC", "SCAN_PATTERN"]);
export const isCritical = (reasons = []) =>
  reasons.some((r) => CRITICAL_REASONS.has(r));
