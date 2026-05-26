"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Cable, Gauge, Settings, Zap } from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/dashboard", icon: Gauge, label: "Dashboard" },
  { href: "/dashboard/analyze", icon: Zap, label: "Analyze" },
  { href: "/dashboard/connectors", icon: Cable, label: "Connectors" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="z-10 flex w-16 shrink-0 flex-col items-center border-r border-slate-200 bg-white/90 px-0 py-4 backdrop-blur dark:border-white/10 dark:bg-slate-950/90">
      <Link
        href="/dashboard"
        aria-label="TracePilot dashboard"
        className="mb-5 grid h-9 w-9 place-items-center rounded-lg bg-red-600 text-white shadow-[0_0_22px_rgba(220,38,38,0.36)]"
      >
        <BarChart3 size={18} />
      </Link>

      <div className="mb-3 h-px w-8 bg-slate-200 dark:bg-white/10" />

      <nav className="flex flex-1 flex-col items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={clsx(
                "relative grid h-10 w-10 place-items-center rounded-lg text-slate-400 transition hover:bg-red-500/10 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-300",
                active && "bg-red-500/10 text-red-600 dark:text-red-300"
              )}
            >
              {active ? <span className="absolute -left-3 top-2 h-6 w-0.5 rounded-r bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.85)]" /> : null}
              <Icon size={18} />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
