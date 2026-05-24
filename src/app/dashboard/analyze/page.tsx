"use client";

import { useRef, useState } from "react";
import { FileArchive, FileUp, Loader2, MessageSquare, Play, Upload } from "lucide-react";
import { incidents, pipelineStages, sampleLog } from "@/components/dashboard/data";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { Badge, Card, MiniLabel, PageHeader, SeverityBadge } from "@/components/dashboard/ui";

type InputMode = "paste" | "file" | "zip";
type AnalysisStatus = "idle" | "running" | "done";

export default function AnalyzePage() {
  const { openChat } = useDashboard();
  const [mode, setMode] = useState<InputMode>("paste");
  const [logText, setLogText] = useState("");
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [stage, setStage] = useState(-1);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showResult = status === "done";

  const runAnalysis = () => {
    if (!logText.trim() || status === "running") return;

    setStatus("running");
    setStage(0);

    pipelineStages.forEach((_, index) => {
      window.setTimeout(() => {
        setStage(index);
        if (index === pipelineStages.length - 1) {
          setStatus("done");
        }
      }, 500 + index * 560);
    });
  };

  const loadFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setLogText(String(event.target?.result ?? ""));
    reader.readAsText(file);
  };

  return (
    <div className="animate-[fadeIn_250ms_ease-out]">
      <PageHeader title="Analyze" subtitle="Paste logs, upload a file, or model a ZIP batch before running the incident pipeline." />

      <section className={showResult ? "grid gap-5 xl:grid-cols-2" : "grid gap-5"}>
        <div className="space-y-4">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/5">
            {[
              { id: "paste" as const, label: "Paste Logs", icon: Play },
              { id: "file" as const, label: "Upload File", icon: FileUp },
              { id: "zip" as const, label: "ZIP Batch", icon: FileArchive }
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

          {mode === "zip" ? (
            <Card className="grid gap-4 p-5 md:grid-cols-[1fr_1.2fr]">
              <div>
                <MiniLabel>ZIP Limits</MiniLabel>
                <dl className="mt-4 space-y-3 text-sm">
                  {[
                    ["Max entries before rejection", "400 files"],
                    ["Default processed", "25 files"],
                    ["API processed", "100 files"],
                    ["Per-file size", "500 KB"],
                    ["Supported", ".txt .log .json .csv"]
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 border-b border-slate-200 pb-2 dark:border-white/10">
                      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
                      <dd className="font-mono text-xs text-red-600 dark:text-red-300">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="grid min-h-48 place-items-center rounded-lg border-2 border-dashed border-slate-200 text-center dark:border-white/10">
                <div>
                  <FileArchive className="mx-auto text-slate-400" size={34} />
                  <p className="mt-3 font-medium text-slate-900 dark:text-white">Batch analyzer ready</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Each valid file becomes one analysis job.</p>
                </div>
              </div>
            </Card>
          ) : null}

          {status !== "idle" ? (
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <MiniLabel>Pipeline Progress</MiniLabel>
                {status === "done" ? <Badge tone="green">Complete</Badge> : <Badge tone="amber">Running</Badge>}
              </div>
              <div className="grid grid-cols-4 gap-2">
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
                onClick={() => openChat(incidents[0])}
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
                  <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">{incidents[0].summary}</p>
                </div>
                <SeverityBadge severity="critical" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="amber">Connection pool exhausted</Badge>
                <Badge tone="blue">Source auth-service</Badge>
              </div>
            </Card>

            <Card className="p-5">
              <MiniLabel>Root Cause Analysis</MiniLabel>
              <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
                ECONNREFUSED on db-primary:5432 after three consecutive retries indicates the primary database process or route is unavailable. The circuit breaker opened correctly, but upstream writes are now blocked.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm text-slate-500 dark:text-slate-400">Confidence</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-slate-200 dark:bg-white/10">
                  <div className="h-full w-[94%] rounded bg-emerald-400" />
                </div>
                <span className="font-mono text-sm text-emerald-600 dark:text-emerald-300">94%</span>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
                <MiniLabel>Supporting Evidence</MiniLabel>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-white/10">
                {incidents[0].evidence.map((line) => (
                  <p key={line} className="px-5 py-3 font-mono text-xs leading-6 text-slate-600 dark:text-slate-300">
                    <span className="text-red-500">›</span> {line}
                  </p>
                ))}
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
                <MiniLabel>Remediation Steps</MiniLabel>
                <Badge tone="green">{incidents[0].actions.length} Actions</Badge>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-white/10">
                {incidents[0].actions.map((action, index) => (
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
