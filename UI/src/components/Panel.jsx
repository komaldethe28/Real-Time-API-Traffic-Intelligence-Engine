import { cn } from "@/lib/utils";

export default function Panel({ title, subtitle, action, className, children }) {
  return (
    <section className={cn("rounded-xl border border-border surface-card", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
