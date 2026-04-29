import { cn } from "@/lib/utils";

export default function StatCard({ label, value, hint, accent = "primary", icon: Icon }) {
  const ring = {
    primary: "from-primary/20 to-transparent",
    accent: "from-accent/20 to-transparent",
    destructive: "from-destructive/20 to-transparent",
    success: "from-success/20 to-transparent",
  }[accent];

  return (
    <div className="relative overflow-hidden rounded-xl border border-border surface-card p-5 animate-fade-in-up">
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60", ring)} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-semibold text-foreground">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        {Icon && (
          <div className="rounded-lg border border-border bg-secondary/60 p-2 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
