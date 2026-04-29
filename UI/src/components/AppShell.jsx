import { NavLink, useLocation } from "react-router-dom";
import { Activity, ShieldAlert, Radar } from "lucide-react";
import { cn } from "@/lib/utils";
import StatusDot from "./StatusDot";
import { useSocketStatus } from "@/hooks/useSocket";

const items = [
  { to: "/",       label: "Dashboard", icon: Activity },
  { to: "/alerts", label: "Alerts",    icon: ShieldAlert },
];

export default function AppShell({ children }) {
  const status = useSocketStatus();
  const loc = useLocation();

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Radar className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-none">Sentinel</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Traffic Intelligence</div>
          </div>
        </div>
        <nav className="mt-2 flex-1 px-3">
          {items.map((it) => {
            const active = loc.pathname === it.to || (it.to !== "/" && loc.pathname.startsWith(it.to));
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === "/"}
                className={cn(
                  "mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <it.icon className="h-4 w-4" />
                <span>{it.label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border px-5 py-4">
          <StatusDot status={status} />
          <div className="mt-1 text-[11px] text-muted-foreground">WebSocket stream</div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-primary">
            <Radar className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">Sentinel</span>
        </div>
        <StatusDot status={status} />
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background/90 backdrop-blur md:hidden">
        {items.map((it) => {
          const active = loc.pathname === it.to || (it.to !== "/" && loc.pathname.startsWith(it.to));
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === "/"}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-[11px]",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <it.icon className="h-5 w-5" />
              {it.label}
            </NavLink>
          );
        })}
      </nav>

      <main className="md:pl-60">
        <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-6 md:px-8 md:pb-10">
          {children}
        </div>
      </main>
    </div>
  );
}
