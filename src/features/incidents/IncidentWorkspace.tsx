"use client";

import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2, RadioTower } from "lucide-react";
import { AGENT_STAGES, buildPreviewAssessment } from "./agents";
import { createIncidentDraft, incidentInputSchema, type IncidentDraft } from "./schema";

const defaultText =
  "Checkout latency climbed above 2.8s after the 09:30 deploy. Payment requests are timing out, retry volume is elevated, and the API logs show database connection pool saturation with intermittent connection refused errors.";

export function IncidentWorkspace() {
  const [title, setTitle] = useState("Checkout latency spike after deploy");
  const [source, setSource] = useState("manual");
  const [description, setDescription] = useState(defaultText);
  const [draft, setDraft] = useState<IncidentDraft | null>(null);
  const [error, setError] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);

  const preview = useMemo(() => (draft ? buildPreviewAssessment(draft) : null), [draft]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsPreparing(true);
    window.setTimeout(() => {
      const parsed = incidentInputSchema.safeParse({ title, source, description });
      if (!parsed.success) {
        setDraft(null);
        setError(parsed.error.issues[0]?.message || "Check the incident details and try again.");
        setIsPreparing(false);
        return;
      }
      setDraft(createIncidentDraft(parsed.data));
      setIsPreparing(false);
    }, 350);
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
