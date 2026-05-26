"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { mapIncidentRecord } from "@/components/dashboard/mappers";
import { statusStyles, toneColors } from "@/components/dashboard/theme";
import { Badge, Card, Donut, MiniLabel, PageHeader, SeverityBadge, Sparkline } from "@/components/dashboard/ui";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import type { IncidentRecord } from "@/features/incidents/types";

export default function DashboardHome() {
  const { openChat } = useDashboard();
  const [records, setRecords] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const incidents = useMemo(() => records.map(mapIncidentRecord), [records]);
  const stats = useMemo(() => buildDashboardStats(records), [records]);
  const activeCount = incidents.filter((incident) => incident.status === "open" || incident.status === "investigating").length;

  useEffect(() => {
    let active = true;
    fetch("/api/incidents")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not load incidents.");
        if (active) setRecords(payload.incidents);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load incidents.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="animate-[fadeIn_250ms_ease-out]">
      <PageHeader
        title="Dashboard"
        subtitle="Real-time incident intelligence, confidence scoring, and remediation readiness."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={stats.criticalCount > 0 ? "red" : "green"}>{stats.criticalCount > 0 ? "Critical Active" : "All Systems Operational"}</Badge>
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
      {error ? <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">{error}</div> : null}
      {loading ? <DashboardSkeleton /> : (
        <>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.kpis.map((kpi) => (
              <Card key={kpi.label} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <MiniLabel>{kpi.label}</MiniLabel>
                    <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">{kpi.value}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{kpi.delta}</p>
                  </div>
                  <Sparkline data={kpi.sparkline} color={toneColors[kpi.tone]} />
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
                {incidents.length ? incidents.map((incident) => (
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
                )) : (
                  <div className="px-5 py-12 text-center">
                    <p className="font-medium text-slate-900 dark:text-white">No incidents yet</p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Run your first log analysis to populate this dashboard.</p>
                  </div>
                )}
              </div>
            </Card>

            <div className="grid gap-4">
              <Card className="p-5">
                <MiniLabel>Severity Mix</MiniLabel>
                <div className="mt-4 flex items-center gap-5">
                  <div className="relative h-24 w-24">
                    <Donut
                      segments={stats.severitySegments}
                    />
                    <div className="absolute inset-0 grid place-items-center text-center">
                      <div>
                        <p className="text-2xl font-semibold text-slate-950 dark:text-white">{records.length}</p>
                        <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-slate-400">Total</p>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    {stats.severityRows.map(({ label, percent, dot }) => (
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
                  {stats.hourlyDensity.map((value, index) => (
                    <div
                      key={`${value}-${index}`}
                      className="flex-1 rounded-t bg-red-500/25 transition hover:bg-red-500/60"
                      style={{ height: `${Math.max(6, (value / Math.max(1, stats.maxHourlyDensity)) * 100)}%` }}
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
                    { label: "Low", pct: stats.severityPct.low, className: "bg-emerald-400" },
                    { label: "Medium", pct: stats.severityPct.medium, className: "bg-amber-400" },
                    { label: "High + Critical", pct: stats.severityPct.high + stats.severityPct.critical, className: "bg-red-500" }
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
        </>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="w-full">
                <div className="h-3 w-28 rounded bg-slate-200 dark:bg-white/10" />
                <div className="mt-4 h-10 w-20 rounded bg-slate-200 dark:bg-white/10" />
                <div className="mt-3 h-3 w-32 rounded bg-slate-200 dark:bg-white/10" />
              </div>
              <div className="h-12 w-20 rounded bg-slate-200 dark:bg-white/10" />
            </div>
          </Card>
        ))}
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
            <div className="h-3 w-36 rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-6 w-20 rounded bg-slate-200 dark:bg-white/10" />
          </div>
          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center">
                <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-200 dark:bg-white/10" />
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="h-3 w-16 rounded bg-slate-200 dark:bg-white/10" />
                    <div className="h-5 w-20 rounded bg-slate-200 dark:bg-white/10" />
                  </div>
                  <div className="h-4 w-full max-w-md rounded bg-slate-200 dark:bg-white/10" />
                  <div className="mt-2 h-3 w-40 rounded bg-slate-200 dark:bg-white/10" />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="h-6 w-16 rounded bg-slate-200 dark:bg-white/10" />
                  <div className="h-8 w-20 rounded bg-slate-200 dark:bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="p-5">
            <div className="h-3 w-28 rounded bg-slate-200 dark:bg-white/10" />
            <div className="mt-4 flex items-center gap-5">
              <div className="h-24 w-24 rounded-full bg-slate-200 dark:bg-white/10" />
              <div className="flex-1 space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-slate-200 dark:bg-white/10" />
                    <div className="h-3 flex-1 rounded bg-slate-200 dark:bg-white/10" />
                    <div className="h-3 w-8 rounded bg-slate-200 dark:bg-white/10" />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {[0, 1].map((item) => (
            <Card key={item} className="p-5">
              <div className="h-3 w-32 rounded bg-slate-200 dark:bg-white/10" />
              <div className="mt-4 flex h-20 items-end gap-1">
                {Array.from({ length: 16 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t bg-slate-200 dark:bg-white/10"
                    style={{ height: `${20 + ((index * 17) % 70)}%` }}
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

type KpiTone = keyof typeof toneColors;

function buildDashboardStats(records: IncidentRecord[]) {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const today = records.filter((record) => new Date(record.createdAt).getTime() >= oneDayAgo);
  const lastWeek = records.filter((record) => new Date(record.createdAt).getTime() >= sevenDaysAgo);
  const completed = records.filter((record) => record.status === "completed");
  const active = records.filter((record) => record.status === "running" || record.status === "draft");
  const avgConfidence = records.length ? Math.round((records.reduce((sum, record) => sum + record.analysis.confidence, 0) / records.length) * 100) : 0;
  const criticalCount = records.filter((record) => record.severity === "critical").length;
  const severityCounts = {
    critical: records.filter((record) => record.severity === "critical").length,
    high: records.filter((record) => record.severity === "high").length,
    medium: records.filter((record) => record.severity === "medium").length,
    low: records.filter((record) => record.severity === "low").length
  };
  const severityPct = {
    critical: pct(severityCounts.critical, records.length),
    high: pct(severityCounts.high, records.length),
    medium: pct(severityCounts.medium, records.length),
    low: pct(severityCounts.low, records.length)
  };
  const hourlyDensity = Array.from({ length: 24 }, (_, index) => {
    const hourStart = now - (23 - index) * 60 * 60 * 1000;
    const hourEnd = hourStart + 60 * 60 * 1000;
    return records.filter((record) => {
      const created = new Date(record.createdAt).getTime();
      return created >= hourStart && created < hourEnd;
    }).length;
  });
  const maxHourlyDensity = Math.max(...hourlyDensity, 1);

  const kpis: Array<{ label: string; value: string; delta: string; tone: KpiTone; sparkline: number[] }> = [
    {
      label: "Active Incidents",
      value: String(active.length),
      delta: `${criticalCount} critical total`,
      tone: criticalCount ? "red" : "green",
      sparkline: rollingCounts(records, 14)
    },
    {
      label: "Analyses Today",
      value: String(today.length),
      delta: `${lastWeek.length} in last 7 days`,
      tone: "blue",
      sparkline: rollingCounts(records, 14)
    },
    {
      label: "Avg. Confidence",
      value: `${avgConfidence}%`,
      delta: records.length ? `${completed.length} completed` : "No analyses yet",
      tone: "green",
      sparkline: rollingConfidence(records, 14)
    },
    {
      label: "Stored Reports",
      value: String(records.length),
      delta: `${completed.length} ready to review`,
      tone: "amber",
      sparkline: cumulativeCounts(records, 14)
    }
  ];

  return {
    kpis,
    criticalCount,
    severityPct,
    hourlyDensity,
    maxHourlyDensity,
    severitySegments: [
      { pct: severityPct.critical || (records.length ? 0 : 25), color: "#ef4444" },
      { pct: severityPct.high || (records.length ? 0 : 25), color: "#fb923c", opacity: 0.85 },
      { pct: severityPct.medium || (records.length ? 0 : 25), color: "#f59e0b", opacity: 0.75 },
      { pct: severityPct.low || (records.length ? 0 : 25), color: "#34d399", opacity: 0.7 }
    ],
    severityRows: [
      { label: "Critical", percent: `${severityPct.critical}%`, dot: "bg-red-500" },
      { label: "High", percent: `${severityPct.high}%`, dot: "bg-orange-400" },
      { label: "Medium", percent: `${severityPct.medium}%`, dot: "bg-amber-400" },
      { label: "Low", percent: `${severityPct.low}%`, dot: "bg-emerald-400" }
    ]
  };
}

function pct(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function rollingCounts(records: IncidentRecord[], days: number) {
  const now = Date.now();
  return Array.from({ length: days }, (_, index) => {
    const start = now - (days - index) * 24 * 60 * 60 * 1000;
    const end = start + 24 * 60 * 60 * 1000;
    return records.filter((record) => {
      const created = new Date(record.createdAt).getTime();
      return created >= start && created < end;
    }).length;
  });
}

function cumulativeCounts(records: IncidentRecord[], days: number) {
  const counts = rollingCounts(records, days);
  let total = 0;
  return counts.map((count) => {
    total += count;
    return total;
  });
}

function rollingConfidence(records: IncidentRecord[], days: number) {
  const now = Date.now();
  return Array.from({ length: days }, (_, index) => {
    const start = now - (days - index) * 24 * 60 * 60 * 1000;
    const end = start + 24 * 60 * 60 * 1000;
    const dayRecords = records.filter((record) => {
      const created = new Date(record.createdAt).getTime();
      return created >= start && created < end;
    });
    return dayRecords.length ? Math.round((dayRecords.reduce((sum, record) => sum + record.analysis.confidence, 0) / dayRecords.length) * 100) : 0;
  });
}
