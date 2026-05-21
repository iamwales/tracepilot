import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUserId } from "@/lib/auth/user";
import { getIncident } from "@/features/incidents/store";
import { CopyReportButton } from "@/components/CopyReportButton";

export default async function IncidentReportPage({ params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) notFound();

  const incident = await getIncident(userId, params.id);
  if (!incident) notFound();

  return (
    <main className="min-h-screen bg-[#06070d] px-5 py-6 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100">
          <ArrowLeft size={16} />
          Back to console
        </Link>

        <section className="panel mt-6 p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Incident report</p>
              <h1 className="mt-3 text-3xl font-semibold text-white">{incident.title}</h1>
              <p className="mt-2 text-sm text-slate-400">
                {incident.source} · {new Date(incident.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
              {incident.severity.toUpperCase()}
            </div>
          </div>

          <div className="grid gap-5 py-6 md:grid-cols-3">
            <ReportStat label="Confidence" value={`${Math.round(incident.analysis.confidence * 100)}%`} />
            <ReportStat label="Evidence" value={String(incident.analysis.evidence.length)} />
            <ReportStat label="Actions" value={String(incident.analysis.actions.length)} />
          </div>

          <article className="whitespace-pre-wrap border border-white/10 bg-black/20 p-5 font-mono text-sm leading-7 text-slate-200">
            {incident.analysis.report}
          </article>

          <div className="mt-5 flex flex-wrap gap-3">
            <CopyReportButton report={incident.analysis.report} />
          </div>
        </section>
      </div>
    </main>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
