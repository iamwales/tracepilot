"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardList, ExternalLink, Loader2, RadioTower } from "lucide-react";
import { AGENT_STAGES, buildPreviewAssessment } from "./agents";
import { createIncidentDraft, incidentInputSchema, type IncidentDraft } from "./schema";
import type { IncidentRecord } from "./types";

const defaultText =
  "Checkout latency climbed above 2.8s after the 09:30 deploy. Payment requests are timing out, retry volume is elevated, and the API logs show database connection pool saturation with intermittent connection refused errors.";

export function IncidentWorkspace() {
  const [title, setTitle] = useState("Checkout latency spike after deploy");
  const [source, setSource] = useState("manual");
  const [description, setDescription] = useState(defaultText);
  const [draft, setDraft] = useState<IncidentDraft | null>(null);
  const [error, setError] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const [incident, setIncident] = useState<IncidentRecord | null>(null);
  const [history, setHistory] = useState<IncidentRecord[]>([]);

  const preview = useMemo(() => (draft ? buildPreviewAssessment(draft) : null), [draft]);

  useEffect(() => {
    let mounted = true;
    fetch("/api/incidents")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (mounted && payload?.incidents) {
          setHistory(payload.incidents.slice(0, 4));
        }
      })
      .catch(() => {
        /* History is helpful, but the console should still work if it cannot load. */
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIncident(null);
    setIsPreparing(true);

    const parsed = incidentInputSchema.safeParse({ title, source, description });
    if (!parsed.success) {
      setDraft(null);
      setError(parsed.error.issues[0]?.message || "Check the incident details and try again.");
      setIsPreparing(false);
      return;
    }

    try {
      setDraft(createIncidentDraft(parsed.data));
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not run the agent pipeline.");
      setIncident(payload.incident);
      setHistory((current) => [payload.incident, ...current.filter((item) => item.id !== payload.incident.id)].slice(0, 4));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not run the agent pipeline.");
    } finally {
      setIsPreparing(false);
    }
  }

  return (
    <section className="panel grid overflow-hidden lg:grid-cols-[1fr_0.9fr]">
      <form onSubmit={onSubmit} className="border-b border-white/10 p-5 sm:p-6 lg:border-b-0 lg:border-r">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Incident input</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Prepare a triage run</h2>
          </div>
          <RadioTower className="text-cyan-200" size={22} />
        </div>

        <label className="block text-sm text-slate-300">
          Incident title
          <input
            className="mt-2 w-full border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="mt-4 block text-sm text-slate-300">
          Source
          <select
            className="mt-2 w-full border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="manual">Manual paste</option>
            <option value="cloudwatch">CloudWatch</option>
            <option value="datadog">Datadog</option>
            <option value="prometheus">Prometheus</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="mt-4 block text-sm text-slate-300">
          Logs or incident context
          <textarea
            className="mt-2 min-h-52 w-full resize-y border border-white/10 bg-black/20 px-3 py-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/60"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        {error ? (
          <div className="mt-4 flex items-start gap-2 border border-rose-300/30 bg-rose-400/10 p-3 text-sm text-rose-100">
            <AlertTriangle className="mt-0.5 shrink-0" size={16} />
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <button className="control-button inline-flex items-center gap-2" type="submit" disabled={isPreparing}>
            {isPreparing ? <Loader2 size={16} className="animate-spin" /> : <ClipboardList size={16} />}
            Prepare run
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              setDraft(null);
              setIncident(null);
              setError("");
            }}
          >
            Clear preview
          </button>
        </div>
      </form>

      <div className="p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Agent route</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Pipeline preview</h2>

        <div className="mt-5 space-y-3">
          {AGENT_STAGES.map((stage, index) => (
            <div key={stage.id} className="border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center border border-cyan-300/30 bg-cyan-300/10 text-xs text-cyan-100">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-white">{stage.name}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-400">{stage.role}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{stage.output}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {preview && draft ? (
          <div className="mt-5 border border-emerald-300/25 bg-emerald-300/10 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-100">
              <CheckCircle2 size={17} />
              Incident draft ready
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <PreviewStat label="Severity" value={preview.severityHint} />
              <PreviewStat label="Signals" value={String(draft.signalCount)} />
              <PreviewStat label="Confidence" value={`${Math.round(preview.confidence * 100)}%`} />
            </dl>
            <p className="mt-4 text-sm leading-6 text-emerald-50/80">{preview.summary}</p>
            <p className="mt-3 font-mono text-xs text-emerald-100/70">{draft.fingerprint}</p>
          </div>
        ) : null}

        {incident ? (
          <div className="mt-5 border border-cyan-300/25 bg-cyan-300/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-cyan-100">
                  <CheckCircle2 size={17} />
                  Agent run completed
                </div>
                <p className="mt-3 text-sm leading-6 text-cyan-50/80">{incident.analysis.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-cyan-100/80">
                  <span className="border border-cyan-300/20 bg-black/20 px-2 py-1">
                    {incident.analysis.provider || "deterministic"}
                  </span>
                  <span className="border border-cyan-300/20 bg-black/20 px-2 py-1">
                    {incident.analysis.model || "deterministic-fallback"}
                  </span>
                  {incident.analysis.observability?.traceId ? (
                    <span className="border border-cyan-300/20 bg-black/20 px-2 py-1">
                      {incident.analysis.observability.traceId}
                    </span>
                  ) : null}
                </div>
              </div>
              <Link
                href={`/incidents/${incident.id}`}
                className="inline-flex shrink-0 items-center gap-2 border border-cyan-300/30 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-300/10"
              >
                Report
                <ExternalLink size={14} />
              </Link>
            </div>

            <div className="mt-4 space-y-2">
              {incident.analysis.guardrails ? (
                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  <div className="border border-emerald-300/20 bg-emerald-300/10 p-3 text-emerald-100">
                    Input guardrail: {incident.analysis.guardrails.input.message}
                  </div>
                  <div className="border border-emerald-300/20 bg-emerald-300/10 p-3 text-emerald-100">
                    Output guardrail: {incident.analysis.guardrails.output.message}
                  </div>
                </div>
              ) : null}
              {incident.analysis.stages.map((stage) => (
                <div key={stage.id} className="border border-white/10 bg-black/20 p-3 text-sm text-slate-300">
                  <span className="text-cyan-200">{stage.stage}</span>
                  <span className="text-slate-500"> · </span>
                  {String(stage.output.summary)}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {history.length ? (
          <div className="mt-5 border border-white/10 bg-white/[0.025] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Recent runs</p>
            <div className="mt-3 space-y-2">
              {history.map((item) => (
                <Link
                  key={item.id}
                  href={`/incidents/${item.id}`}
                  className="flex items-center justify-between gap-3 border border-white/10 bg-black/20 px-3 py-3 text-sm hover:bg-white/[0.04]"
                >
                  <span className="line-clamp-1 text-slate-200">{item.title}</span>
                  <span className="shrink-0 text-xs uppercase text-cyan-200">{item.severity}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.18em] text-emerald-100/50">{label}</dt>
      <dd className="mt-1 capitalize text-emerald-50">{value}</dd>
    </div>
  );
}
