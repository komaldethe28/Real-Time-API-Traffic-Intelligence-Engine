import { AlertTriangle, RefreshCw } from "lucide-react";

export function LoadingBlock({ label = "Loading…", height = 220 }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground"
      style={{ minHeight: height }}
    >
      <span className="inline-flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        {label}
      </span>
    </div>
  );
}

export function EmptyBlock({ label = "No data yet", height = 220 }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground"
      style={{ minHeight: height }}
    >
      {label}
    </div>
  );
}

export function ErrorBlock({ error, onRetry, height = 220 }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive"
      style={{ minHeight: height }}
    >
      <AlertTriangle className="h-5 w-5" />
      <div>
        <div className="font-medium">Couldn’t load data</div>
        <div className="mt-1 text-xs text-destructive/80">
          {error?.message || "Backend unreachable"}
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      )}
    </div>
  );
}
