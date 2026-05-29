"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { UserButton } from "@clerk/nextjs";
import { Bell, Moon, Search, Sun } from "lucide-react";
import { clsx } from "clsx";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/analyze": "Analyze",
  "/dashboard/connectors": "Connectors",
  "/dashboard/settings": "Settings"
};

export function Topbar() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = mounted ? resolvedTheme !== "light" : true;
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  useEffect(() => setMounted(true), []);

  return (
    <header className="z-10 flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white/86 px-4 backdrop-blur dark:border-white/10 dark:bg-slate-950/86 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-slate-400">TracePilot</span>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="truncate font-mono text-[0.65rem] uppercase tracking-[0.18em] text-red-600 dark:text-red-300">
          {pageTitles[pathname] ?? "Dashboard"}
        </span>
      </div>

      <div className="ml-auto hidden h-9 w-64 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-slate-500 dark:border-white/10 dark:bg-white/5 sm:flex">
        <Search size={15} />
        <input
          aria-label="Search incidents"
          placeholder="Search incidents..."
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
        />
      </div>

      <button
        type="button"
        aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={clsx(
          "inline-flex h-9 items-center gap-2 rounded-md border px-3 font-mono text-[0.65rem] uppercase tracking-[0.14em] transition",
          "border-slate-200 bg-slate-50 text-slate-600 hover:border-red-300 hover:text-red-600",
          "dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-red-400/40 dark:hover:text-red-300"
        )}
      >
        {isDark ? <Moon size={15} /> : <Sun size={15} />}
        <span className="hidden sm:inline">{isDark ? "Dark" : "Light"}</span>
      </button>

      <button
        type="button"
        aria-label="Notifications"
        className="relative grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:text-red-300"
      >
        <Bell size={16} />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
      </button>

      <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-2 dark:border-white/10 dark:bg-white/5">
        {hasClerk ? (
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              variables: {
                colorPrimary: "#dc2626",
                colorText: isDark ? "#f8fafc" : "#0f172a",
                colorTextSecondary: isDark ? "#94a3b8" : "#64748b",
                colorBackground: isDark ? "#020617" : "#ffffff",
                colorInputBackground: isDark ? "#0f172a" : "#f8fafc",
                colorBorder: isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0",
                borderRadius: "8px",
                fontFamily: "var(--font-body), sans-serif"
              },
              elements: {
                userButtonTrigger: "focus:shadow-none focus:ring-2 focus:ring-red-500/30 rounded-md",
                userButtonAvatarBox: "h-7 w-7 border border-red-500/50 shadow-[0_0_12px_rgba(220,38,38,0.18)]",
                userButtonPopoverCard:
                  "mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white p-0 shadow-2xl shadow-slate-950/10 dark:border-white/10 dark:bg-slate-950 dark:shadow-black/40",
                userButtonPopoverMain: "bg-white dark:bg-slate-950",
                userButtonPopoverFooter: "hidden",
                userPreviewMainIdentifier: "text-sm font-semibold text-slate-950 dark:text-white",
                userPreviewSecondaryIdentifier: "text-xs text-slate-500 dark:text-slate-400",
                userButtonPopoverActionButton:
                  "mx-2 my-1 rounded-md px-3 py-2 text-sm text-slate-700 transition hover:bg-red-500/10 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-300",
                userButtonPopoverActionButtonText: "font-medium",
                userButtonPopoverActionButtonIcon: "text-slate-400 dark:text-slate-500",
                userButtonPopoverActionButton__manageAccount: "border-t border-slate-200 pt-3 dark:border-white/10",
                userButtonPopoverActionButton__signOut: "text-red-600 dark:text-red-300",
                userButtonPopoverActions: "py-2",
                userPreview: "border-b border-slate-200 px-4 py-3 dark:border-white/10"
              }
            }}
          />
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-md border border-red-500/40 bg-red-500/10 font-mono text-xs text-red-600 dark:text-red-300">
            TP
          </span>
        )}
      </div>
    </header>
  );
}
