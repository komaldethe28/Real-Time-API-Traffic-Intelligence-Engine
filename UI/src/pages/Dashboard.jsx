import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ShieldAlert, Clock, ServerCrash, ArrowUpRight } from "lucide-react";
import Panel from "@/components/Panel";
import StatCard from "@/components/StatCard";
import TrafficLineChart from "@/components/TrafficLineChart";
import TopIpsBarChart from "@/components/TopIpsBarChart";
import { LoadingBlock, EmptyBlock, ErrorBlock } from "@/components/States";
import { useApi } from "@/hooks/useApi";
import { fetchOverview } from "@/services/api";
import { formatNumber, minuteKeyToLabel } from "@/utils/format";
import { useSocketEvent } from "@/hooks/useSocket";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApi(fetchOverview, { intervalMs: 5000 });

  // Refresh on key WS events
  useSocketEvent(() => { refetch(); }, ["metrics_tick", "block", "admin_unblock"]);

  const minutes = data?.minutes || [];
  const rollups = data?.rollups || [];
  const latest = rollups.length ? rollups[rollups.length - 1] : null;
  const blocked = data?.blockedSample || [];

  const lineData = useMemo(() => {
    return minutes.map((m, i) => ({
      label: minuteKeyToLabel(m),
      total: rollups[i]?.total ?? 0,
    }));
  }, [minutes, rollups]);

  const topIps = (latest?.topIps || []).slice(0, 8);
  const topEndpoints = (latest?.topEndpoints || []).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Traffic Overview</h1>
          <p className="text-sm text-muted-foreground">
            Live API traffic, anomalies, and top sources — refreshed every 5s.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          Current minute:{" "}
          <span className="font-mono text-foreground">
            {data?.currentMinuteKey || "—"}
          </span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Requests (latest min)"
          value={loading && !data ? "…" : formatNumber(latest?.total || 0)}
          hint="From most recent rollup"
          icon={Activity}
          accent="primary"
        />
        <StatCard
          label="Blocked IPs"
          value={loading && !data ? "…" : formatNumber(blocked.length)}
          hint="In current sample"
          icon={ShieldAlert}
          accent="destructive"
        />
        <StatCard
          label="Top endpoints"
          value={loading && !data ? "…" : formatNumber(topEndpoints.length)}
          hint="Tracked this minute"
          icon={ServerCrash}
          accent="accent"
        />
        <StatCard
          label="Window"
          value={`${minutes.length}m`}
          hint={minutes[0] ? `Since ${minuteKeyToLabel(minutes[0])}` : "—"}
          icon={Clock}
          accent="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          title="Requests over time"
          subtitle="Total per minute across the visible window"
          className="lg:col-span-2"
        >
          {loading && !data ? (
            <LoadingBlock />
          ) : error && !data ? (
            <ErrorBlock error={error} onRetry={refetch} />
          ) : lineData.length === 0 ? (
            <EmptyBlock label="No traffic data yet" />
          ) : (
            <TrafficLineChart data={lineData} />
          )}
        </Panel>

        <Panel
          title="Top IPs"
          subtitle="Click a bar to drill down"
        >
          {loading && !data ? (
            <LoadingBlock />
          ) : error && !data ? (
            <ErrorBlock error={error} onRetry={refetch} />
          ) : topIps.length === 0 ? (
            <EmptyBlock label="No IP activity" />
          ) : (
            <TopIpsBarChart
              data={topIps}
              onSelect={(ip) => ip && navigate(`/ip/${encodeURIComponent(ip)}`)}
            />
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Top Endpoints" subtitle="Most-hit paths in the latest minute" className="lg:col-span-2">
          {loading && !data ? (
            <LoadingBlock height={180} />
          ) : topEndpoints.length === 0 ? (
            <EmptyBlock label="No endpoint data" height={180} />
          ) : (
            <ul className="divide-y divide-border">
              {topEndpoints.map((e, i) => {
                const max = topEndpoints[0]?.count || 1;
                const pct = Math.max(4, Math.round((e.count / max) * 100));
                return (
                  <li key={`${e.endpoint}-${i}`} className="flex items-center gap-4 py-3">
                    <span className="w-6 text-right text-xs text-muted-foreground">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-sm">{e.endpoint}</span>
                    <div className="hidden h-2 w-40 overflow-hidden rounded-full bg-muted sm:block">
                      <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-16 text-right text-sm font-semibold">{formatNumber(e.count)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Recently blocked" subtitle="Sample from the engine">
          {blocked.length === 0 ? (
            <EmptyBlock label="No blocked IPs" height={180} />
          ) : (
            <ul className="space-y-2">
              {blocked.slice(0, 8).map((b, i) => (
                <li
                  key={`${b.ip}-${i}`}
                  className="group flex cursor-pointer items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2 transition-colors hover:border-primary/40 hover:bg-secondary"
                  onClick={() => navigate(`/ip/${encodeURIComponent(b.ip)}`)}
                >
                  <div className="min-w-0">
                    <div className="font-mono text-sm">{b.ip}</div>
                    <div className="truncate text-xs text-destructive/90">{b.reason}</div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
