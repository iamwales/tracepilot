"use client";

import { ArrowRight, Plus } from "lucide-react";
import { incidents, kpis } from "@/components/dashboard/data";
import { statusStyles, toneColors } from "@/components/dashboard/theme";
import { Badge, Card, Donut, MiniLabel, PageHeader, SeverityBadge, Sparkline } from "@/components/dashboard/ui";
import { useDashboard } from "@/components/dashboard/DashboardContext";

const density = [12, 8, 24, 18, 6, 32, 28, 14, 9, 22, 18, 38, 29, 16, 8, 14, 20, 35, 27, 18, 12, 28, 44, 22];

export default function DashboardHome() {
  const { openChat } = useDashboard();
  const activeCount = incidents.filter((incident) => incident.status === "open" || incident.status === "investigating").length;

  return (
    <div className="animate-[fadeIn_250ms_ease-out]">
      <PageHeader
        title="Dashboard"
        subtitle="Real-time incident intelligence, confidence scoring, and remediation readiness."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="green">All Systems Operational</Badge>
            <a
              href="/dashboard/analyze"
              className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-white shadow-[0_0_20px_rgba(220,38,38,0.28)] transition hover:bg-red-500"
            >
              <Plus size={14} />
              New Analysis
            </a>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <MiniLabel>{kpi.label}</MiniLabel>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">{kpi.value}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{kpi.delta}</p>
              </div>
              <Sparkline data={kpi.sparkline} color={toneColors[kpi.tone as keyof typeof toneColors]} />
            </div>
          </Card>
        ))}
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
            <MiniLabel>Recent Incidents</MiniLabel>
            <Badge>{activeCount} Active</Badge>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {incidents.map((incident) => (
              <article key={incident.id} className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 dark:hover:bg-white/[0.03] md:flex-row md:items-center">
                <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusStyles[incident.status]}`} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs uppercase tracking-[0.12em] text-slate-400">{incident.id}</span>
                    <SeverityBadge severity={incident.severity} />
                  </div>
                  <h2 className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{incident.title}</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                    {incident.service} · {incident.timeAgo}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone="green">{incident.confidence}%</Badge>
                  <button
                    type="button"
                    onClick={() => openChat(incident)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-red-600 transition hover:bg-red-500/15 dark:text-red-300"
                  >
                    Chat
                    <ArrowRight size={13} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="p-5">
            <MiniLabel>Severity Mix</MiniLabel>
            <div className="mt-4 flex items-center gap-5">
              <div className="relative h-24 w-24">
                <Donut
                  segments={[
                    { pct: 20, color: "#ef4444" },
                    { pct: 35, color: "#fb923c", opacity: 0.85 },
                    { pct: 30, color: "#f59e0b", opacity: 0.75 },
                    { pct: 15, color: "#34d399", opacity: 0.7 }
                  ]}
                />
                <div className="absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-2xl font-semibold text-slate-950 dark:text-white">147</p>
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-slate-400">Total</p>
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {[
                  ["Critical", "20%", "bg-red-500"],
                  ["High", "35%", "bg-orange-400"],
                  ["Medium", "30%", "bg-amber-400"],
                  ["Low", "15%", "bg-emerald-400"]
                ].map(([label, percent, dot]) => (
                  <div key={label} className="flex items-center gap-2 text-sm">
                    <span className={`h-2 w-2 rounded-full ${dot}`} />
                    <span className="text-slate-500 dark:text-slate-400">{label}</span>
                    <span className="ml-auto font-mono text-xs text-slate-500">{percent}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <MiniLabel>Error Density</MiniLabel>
            <div className="mt-4 flex h-20 items-end gap-1">
              {density.map((value, index) => (
                <div
                  key={`${value}-${index}`}
                  className="flex-1 rounded-t bg-red-500/25 transition hover:bg-red-500/60"
                  style={{ height: `${(value / 44) * 100}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between font-mono text-[0.58rem] uppercase tracking-[0.12em] text-slate-400">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>Now</span>
            </div>
          </Card>

          <Card className="p-5">
            <MiniLabel>HTTP Status Classes</MiniLabel>
            <div className="mt-4 space-y-3">
              {[
                { label: "2xx Success", pct: 72, className: "bg-emerald-400" },
                { label: "4xx Client Error", pct: 18, className: "bg-amber-400" },
                { label: "5xx Server Error", pct: 10, className: "bg-red-500" }
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{item.label}</span>
                    <span className="font-mono">{item.pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded bg-slate-200 dark:bg-white/10">
                    <div className={`h-full rounded ${item.className}`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
