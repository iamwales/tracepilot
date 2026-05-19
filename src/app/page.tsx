import { Activity, BrainCircuit, Database, Radar, ShieldCheck, Sparkles } from "lucide-react";
import { AuthControls } from "@/components/AuthControls";
import { IncidentWorkspace } from "@/features/incidents/IncidentWorkspace";
import { AGENT_STAGES } from "@/features/incidents/agents";

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#06070d] text-slate-100">
      <div className="scanline" />
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center border border-cyan-300/40 bg-cyan-300/10 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.18)]">
              <Radar size={21} />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-200">TracePilot</p>
              <p className="text-xs text-slate-400">Autonomous incident triage console</p>
            </div>
          </div>
          <AuthControls />
        </header>

        <div className="grid flex-1 gap-6 py-7 lg:grid-cols-[0.92fr_1.08fr]">
          <aside className="flex flex-col justify-between gap-8">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-200">
                <Sparkles size={14} />
                Day 1 MVP foundation
              </div>
              <h1 className="max-w-2xl text-5xl font-semibold leading-[1.02] text-white sm:text-6xl">
                Multi-agent incident intelligence, built for fast response.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
                Paste messy logs or an incident note. TracePilot structures the signal, previews the agent
                workflow, and prepares the incident record for AI-powered root-cause analysis.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Metric icon={<Activity size={17} />} label="Signal" value="Live triage" />
              <Metric icon={<BrainCircuit size={17} />} label="Agents" value={`${AGENT_STAGES.length} stages`} />
              <Metric icon={<Database size={17} />} label="Data" value="Supabase-ready" />
            </div>

            <div className="panel">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                <ShieldCheck size={17} className="text-emerald-300" />
                Day 1 architecture boundary
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                The UI is decoupled from incident validation and stage planning, so Day 2 can plug in real
                LLM calls and Supabase persistence without rewriting the interface.
              </p>
            </div>
          </aside>

          <IncidentWorkspace />
        </div>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-4 text-cyan-200">{icon}</div>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}
