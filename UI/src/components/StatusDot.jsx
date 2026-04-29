import { cn } from "@/lib/utils";

export default function StatusDot({ status, label, className }) {
  const styles = {
    open:        { dot: "bg-success pulse-dot", text: "text-success",        word: label || "Live" },
    connecting:  { dot: "bg-warning",            text: "text-warning",         word: label || "Reconnecting" },
    closed:      { dot: "bg-destructive",        text: "text-destructive",     word: label || "Offline" },
  };
  const s = styles[status] || styles.closed;
  return (
    <div className={cn("inline-flex items-center gap-2 text-xs font-medium", className)}>
      <span className={cn("h-2 w-2 rounded-full", s.dot)} />
      <span className={s.text}>{s.word}</span>
    </div>
  );
}
