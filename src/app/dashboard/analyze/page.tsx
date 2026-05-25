"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, MessageSquare, Play, Upload } from "lucide-react";
import { pipelineStages, sampleLog } from "@/components/dashboard/data";
import { mapIncidentRecord } from "@/components/dashboard/mappers";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { Badge, Card, MiniLabel, PageHeader, SeverityBadge } from "@/components/dashboard/ui";
import type { IncidentRecord } from "@/features/incidents/types";

type InputMode = "paste" | "file";
type AnalysisStatus = "idle" | "running" | "done";

export default function AnalyzePage() {
  const { openChat } = useDashboard();
  const [mode, setMode] = useState<InputMode>("paste");
  const [logText, setLogText] = useState("");
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [stage, setStage] = useState(-1);
  const [dragOver, setDragOver] = useState(false);
  const [incident, setIncident] = useState<IncidentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showResult = status === "done";
  const mappedIncident = incident ? mapIncidentRecord(incident) : null;
  const primaryRootCause = incident?.analysis.rootCauses[0] ?? "No root cause generated yet.";
  const primaryEvidence = incident?.analysis.evidence[0] ?? "No evidence extracted yet.";

  const runAnalysis = async () => {
    if (!logText.trim() || status === "running") return;

    setError(null);
    setIncident(null);
    setStatus("running");
    setStage(0);

    pipelineStages.forEach((_, index) => {
      window.setTimeout(() => {
        setStage(index);
      }, 500 + index * 560);
    });

    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: inferTitle(logText),
          source: "manual",
          description: logText
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not run analysis.");
      setIncident(payload.incident);
      setStage(pipelineStages.length - 1);
      setStatus("done");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not run analysis.");
      setStatus("idle");
      setStage(-1);
    }
  };

  const loadFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setLogText(String(event.target?.result ?? ""));
    reader.readAsText(file);
  };

  return (
    <div className="animate-[fadeIn_250ms_ease-out]">
      <PageHeader title="Analyze" subtitle="Paste logs or upload a single log file. TracePilot will run the 5-agent incident pipeline and store the result." />
      {error ? <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200">{error}</div> : null}

      <section className={showResult ? "grid gap-5 xl:grid-cols-2" : "grid gap-5"}>
        <div className="space-y-4">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/5">
            {[
              { id: "paste" as const, label: "Paste Logs", icon: Play },
              { id: "file" as const, label: "Upload File", icon: FileUp }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={
                    mode === item.id
                      ? "inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-white"
                      : "inline-flex items-center gap-2 rounded-md px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-500 transition hover:text-red-600 dark:text-slate-400 dark:hover:text-red-300"
                  }
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </div>

          {mode === "paste" ? (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
                <MiniLabel>Raw Log Input</MiniLabel>
                <button
                  type="button"
                  onClick={() => setLogText(sampleLog)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-slate-400 dark:hover:text-red-300"
                >
                  Load Sample
                </button>
              </div>
              <textarea
                value={logText}
                onChange={(event) => setLogText(event.target.value)}
                placeholder="Paste your log data here..."
                className="min-h-[280px] w-full resize-y bg-transparent p-4 font-mono text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-600"
              />
              <div className="flex gap-3 border-t border-slate-200 px-4 py-2 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-slate-400 dark:border-white/10">
                <span>{logText.split("\n").filter(Boolean).length} lines</span>
                <span>{logText.length} chars</span>
              </div>
            </Card>
          ) : null}

          {mode === "file" ? (
            <Card className="p-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  loadFile(event.dataTransfer.files[0]);
                }}
                className={`flex min-h-[240px] w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition ${
                  dragOver ? "border-red-400 bg-red-500/10" : "border-slate-200 hover:border-red-300 dark:border-white/10 dark:hover:border-red-400/40"
                }`}
              >
                <Upload className="text-slate-400" size={34} />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Drop a log file or click to browse</p>
                  <p className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-slate-400">.txt .log .json .md .csv</p>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.log,.json,.md,.ndjson,.csv"
                className="hidden"
                onChange={(event) => loadFile(event.target.files?.[0])}
              />
              {logText ? <div className="mt-3"><Badge tone="green">File loaded · {logText.split("\n").length} lines</Badge></div> : null}
            </Card>
          ) : null}

          {status !== "idle" ? (
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <MiniLabel>Pipeline Progress</MiniLabel>
                {status === "done" ? <Badge tone="green">Complete</Badge> : <Badge tone="amber">Running</Badge>}
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${pipelineStages.length}, minmax(0, 1fr))` }}>
                {pipelineStages.map((name, index) => (
                  <div key={name}>
                    <div className={index <= stage ? "h-1.5 rounded bg-red-500" : "h-1.5 rounded bg-slate-200 dark:bg-white/10"} />
                    <p className={index <= stage ? "mt-2 text-center font-mono text-[0.58rem] uppercase tracking-[0.1em] text-red-600 dark:text-red-300" : "mt-2 text-center font-mono text-[0.58rem] uppercase tracking-[0.1em] text-slate-400"}>
                      {name}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <button
            type="button"
            onClick={runAnalysis}
            disabled={!logText.trim() || status === "running"}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-mono text-xs uppercase tracking-[0.16em] text-white shadow-[0_0_22px_rgba(220,38,38,0.28)] transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-white/10 dark:disabled:text-slate-500"
          >
            {status === "running" ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
            {status === "running" ? "Analyzing" : "Run Analysis"}
          </button>
        </div>

        {showResult ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold uppercase tracking-wide text-slate-950 dark:text-white">Analysis Result</h2>
              <button
                type="button"
                onClick={() => mappedIncident && openChat(mappedIncident)}
                disabled={!mappedIncident}
                className="inline-flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-red-600 transition hover:bg-red-500/15 dark:text-red-300"
              >
                <MessageSquare size={14} />
                Chat About This
              </button>
            </div>

            <Card glow className="p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <MiniLabel>Incident Summary</MiniLabel>
                  <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">{mappedIncident?.summary}</p>
                </div>
                {mappedIncident ? <SeverityBadge severity={mappedIncident.severity} /> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="amber">{primaryRootCause.slice(0, 44)}</Badge>
                <Badge tone="blue">Source {incident?.source ?? "manual"}</Badge>
              </div>
            </Card>

            <Card className="p-5">
              <MiniLabel>Root Cause Analysis</MiniLabel>
              <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
                {(incident?.analysis.rootCauses.length ? incident.analysis.rootCauses : [primaryRootCause]).map((cause) => (
                  <p key={cause}>{cause}</p>
                ))}
              </div>
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-slate-500">Primary evidence</span>
                <p className="mt-2 font-mono text-xs leading-6">{primaryEvidence}</p>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm text-slate-500 dark:text-slate-400">Confidence</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-slate-200 dark:bg-white/10">
                  <div className="h-full rounded bg-emerald-400" style={{ width: `${mappedIncident?.confidence ?? 0}%` }} />
                </div>
                <span className="font-mono text-sm text-emerald-600 dark:text-emerald-300">{mappedIncident?.confidence ?? 0}%</span>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
                <MiniLabel>Supporting Evidence</MiniLabel>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-white/10">
                {(mappedIncident?.evidence ?? []).map((line) => (
                  <p key={line} className="px-5 py-3 font-mono text-xs leading-6 text-slate-600 dark:text-slate-300">
                    <span className="text-red-500">›</span> {line}
                  </p>
                ))}
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
                <MiniLabel>Remediation Steps</MiniLabel>
                <Badge tone="green">{mappedIncident?.actions.length ?? 0} Actions</Badge>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-white/10">
                {(mappedIncident?.actions ?? []).map((action, index) => (
                  <div key={action} className="flex gap-3 px-5 py-4">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-red-500/30 bg-red-500/10 font-mono text-xs text-red-600 dark:text-red-300">
                      {index + 1}
                    </span>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{action}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function inferTitle(text: string) {
  const signalLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /\b(error|failed|timeout|unavailable|refused|critical|exception|degraded)\b/i.test(line));
  const joined = signalLines.join(" ");
  const service = text.match(/\b([a-z][a-z0-9-]*(?:service|svc|api|gateway|worker|pool|db|database)[a-z0-9-]*)\b/i)?.[1];
  const dependency = text.match(/\b([a-z][a-z0-9-]*(?:-[a-z0-9]+)*):(\d{2,5})\b/i)?.[1];
  const primarySignal = joined.match(/\b(ECONNREFUSED|ECONNRESET|ETIMEDOUT|timeout|503|5\d\d|connection pool exhausted|circuit breaker open|latency degraded)\b/i)?.[1];

  if (dependency && primarySignal) {
    return `${dependency} ${normalizeSignal(primarySignal)} cascade`.slice(0, 90);
  }

  if (service && primarySignal) {
    return `${service} ${normalizeSignal(primarySignal)} incident`.slice(0, 90);
  }

  if (primarySignal) {
    return `${normalizeSignal(primarySignal)} incident detected`.slice(0, 90);
  }

  return "Manual log analysis";
}

function normalizeSignal(signal: string) {
  const normalized = signal.toLowerCase();
  if (normalized === "timeout" || normalized === "etimedout") return "timeout";
  if (normalized === "connection pool exhausted") return "pool exhaustion";
  if (normalized === "circuit breaker open") return "circuit breaker open";
  if (normalized === "latency degraded") return "latency degradation";
  return signal.toUpperCase();
}
