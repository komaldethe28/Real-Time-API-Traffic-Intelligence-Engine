import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Panel from "@/components/Panel";
import ReasonBadge from "@/components/ReasonBadge";
import { LoadingBlock, EmptyBlock, ErrorBlock } from "@/components/States";
import { useApi } from "@/hooks/useApi";
import { fetchFlags } from "@/services/api";
import { formatDateTime, isCritical } from "@/utils/format";
import { useSocketEvent } from "@/hooks/useSocket";
import { ShieldAlert, Search } from "lucide-react";

const eventToFlag = (msg) => {
  const p = msg.payload || {};
  const reasonByType = {
    flag: p.reasons || ["FLAG"],
    block: ["BLOCK", ...(p.reasons || [])],
    throttle: ["THROTTLE", ...(p.reasons || [])],
  };
  return {
    id: p.id || `${msg.type}-${p.ip || "?"}-${p.ts || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ip: p.ip || "—",
    reasons: reasonByType[msg.type] || [msg.type.toUpperCase()],
    endpointKey: p.endpointKey || "",
    path: p.path || p.endpointKey || "",
    ts: p.ts || Date.now(),
    meta: p.meta || {},
    _live: true,
  };
};

export default function Alerts() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApi(fetchFlags, { intervalMs: 10000 });
  const [live, setLive] = useState([]);
  const [filter, setFilter] = useState("");

  useSocketEvent((msg) => {
    setLive((prev) => [eventToFlag(msg), ...prev].slice(0, 200));
  }, ["flag", "block", "throttle"]);

  // Reset live buffer if backend list refreshes with same items already present
  useEffect(() => {
    if (!data?.items) return;
    const ids = new Set(data.items.map((i) => i.id));
    setLive((prev) => prev.filter((i) => !ids.has(i.id)));
  }, [data]);

  const all = useMemo(() => {
    const base = data?.items || [];
    const merged = [...live, ...base];
    if (!filter.trim()) return merged;
    const q = filter.trim().toLowerCase();
    return merged.filter(
      (i) =>
        i.ip?.toLowerCase().includes(q) ||
        i.path?.toLowerCase().includes(q) ||
        (i.reasons || []).some((r) => r.toLowerCase().includes(q))
    );
  }, [data, live, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Anomaly Alerts</h1>
          <p className="text-sm text-muted-foreground">
            Real-time anomaly events streamed from the engine.
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by IP, path, reason…"
            className="w-72 max-w-full rounded-lg border border-border bg-secondary/40 pl-9 pr-3 py-2 text-sm outline-none transition-colors focus:border-primary"
          />
        </div>
      </div>

      <Panel
        title="Events"
        subtitle="Newest first — live updates merge instantly"
        action={
          <span className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-2 py-1 text-[11px] text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5 text-primary" /> {all.length} events
          </span>
        }
      >
        {loading && !data ? (
          <LoadingBlock />
        ) : error && !data ? (
          <ErrorBlock error={error} onRetry={refetch} />
        ) : all.length === 0 ? (
          <EmptyBlock label="No alerts in window" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 font-medium">IP</th>
                  <th className="px-3 py-2 font-medium">Event</th>
                  <th className="px-3 py-2 font-medium">Endpoint</th>
                  <th className="px-3 py-2 font-medium">Path</th>
                  <th className="px-3 py-2 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {all.map((row) => {
                  const crit = isCritical(row.reasons || []);
                  return (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/ip/${encodeURIComponent(row.ip)}`)}
                      className={`cursor-pointer border-t border-border transition-colors hover:bg-secondary/40 ${
                        crit ? "bg-destructive/5" : ""
                      } ${row._live ? "animate-fade-in-up" : ""}`}
                    >
                      <td className="px-3 py-3 font-mono text-foreground">
                        <span className="inline-flex items-center gap-2">
                          {crit && <span className="h-2 w-2 rounded-full bg-destructive" />}
                          {row.ip}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {(row.reasons || []).map((r) => (
                            <ReasonBadge key={r} reason={r} />
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{row.endpointKey || "—"}</td>
                      <td className="px-3 py-3 font-mono text-xs">{row.path || "—"}</td>
                      <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                        {formatDateTime(row.ts)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
