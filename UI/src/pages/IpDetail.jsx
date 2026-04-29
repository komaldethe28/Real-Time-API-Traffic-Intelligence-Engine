import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Globe2, Activity, ShieldAlert } from "lucide-react";
import Panel from "@/components/Panel";
import StatCard from "@/components/StatCard";
import TrafficLineChart from "@/components/TrafficLineChart";
import ReasonBadge from "@/components/ReasonBadge";
import { LoadingBlock, EmptyBlock, ErrorBlock } from "@/components/States";
import { useApi } from "@/hooks/useApi";
import { fetchIp } from "@/services/api";
import { formatNumber, formatDateTime, minuteKeyToLabel, isCritical } from "@/utils/format";

export default function IpDetail() {
  const { ip } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApi(() => fetchIp(ip), { intervalMs: 7000, deps: [ip] });

  const series = useMemo(() => {
    return (data?.perMinute || []).map((p) => ({
      label: minuteKeyToLabel(p.minuteKey),
      total: p.count,
    }));
  }, [data]);

  const flags = data?.recentFlags || [];
  const totalReq = series.reduce((a, b) => a + (b.total || 0), 0);
  const critCount = flags.filter((f) => isCritical(f.reasons || [])).length;

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Globe2 className="h-3.5 w-3.5" /> IP detail
          </div>
          <h1 className="mt-1 font-mono text-2xl font-semibold tracking-tight">{ip}</h1>
          <p className="text-sm text-muted-foreground">
            Per-minute request pattern and recent anomaly flags.
          </p>
        </div>
        <Link
          to="/alerts"
          className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          See all alerts
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Requests (window)" value={formatNumber(totalReq)} icon={Activity} accent="primary" />
        <StatCard label="Recent flags" value={formatNumber(flags.length)} icon={ShieldAlert} accent="accent" />
        <StatCard
          label="Critical anomalies"
          value={formatNumber(critCount)}
          icon={ShieldAlert}
          accent={critCount > 0 ? "destructive" : "success"}
        />
      </div>

      <Panel title="Request pattern" subtitle="Per-minute count for this IP">
        {loading && !data ? (
          <LoadingBlock />
        ) : error && !data ? (
          <ErrorBlock error={error} onRetry={refetch} />
        ) : series.length === 0 ? (
          <EmptyBlock label="No traffic recorded for this IP" />
        ) : (
          <TrafficLineChart data={series} />
        )}
      </Panel>

      <Panel title="Recent flags" subtitle="Most recent anomalies attributed to this IP">
        {loading && !data ? (
          <LoadingBlock height={180} />
        ) : flags.length === 0 ? (
          <EmptyBlock label="No flags for this IP" height={180} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Reasons</th>
                  <th className="px-3 py-2 font-medium">Endpoint</th>
                  <th className="px-3 py-2 font-medium">Path</th>
                  <th className="px-3 py-2 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {flags.map((f) => {
                  const crit = isCritical(f.reasons || []);
                  return (
                    <tr
                      key={f.id}
                      className={`border-t border-border ${crit ? "bg-destructive/5" : ""}`}
                    >
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {(f.reasons || []).map((r) => (
                            <ReasonBadge key={r} reason={r} />
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{f.endpointKey || "—"}</td>
                      <td className="px-3 py-3 font-mono text-xs">{f.path || "—"}</td>
                      <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                        {formatDateTime(f.ts)}
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
