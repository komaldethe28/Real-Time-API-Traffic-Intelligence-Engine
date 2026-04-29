import { cn } from "@/lib/utils";

export default function ReasonBadge({ reason, critical }) {
  const isCrit = critical || reason === "SPIKE_TRAFFIC" || reason === "SCAN_PATTERN";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide",
        isCrit
          ? "border-destructive/40 bg-destructive/15 text-destructive"
          : "border-accent/30 bg-accent/10 text-accent"
      )}
      title={reason}
    >
      {reason}
    </span>
  );
}
