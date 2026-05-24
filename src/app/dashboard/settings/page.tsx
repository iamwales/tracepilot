"use client";

import { useState } from "react";
import { ShieldCheck, UserPlus } from "lucide-react";
import { teamMembers as initialMembers } from "@/components/dashboard/data";
import { Badge, Card, MiniLabel, PageHeader } from "@/components/dashboard/ui";
import type { TeamMember } from "@/components/dashboard/types";

type SettingsTab = "profile" | "team" | "subscription" | "notifications";

const tabs: Array<{ id: SettingsTab; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "team", label: "Team" },
  { id: "subscription", label: "Subscription" },
  { id: "notifications", label: "Notifications" }
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState({
    critical: true,
    high: true,
    digest: false,
    remediation: true,
    connectors: false
  });

  const invite = () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setMembers((current) => [
      ...current,
      {
        name: email.split("@")[0],
        email,
        role: "Member",
        initials: email.slice(0, 2).toUpperCase(),
        active: false
      }
    ]);
    setInviteEmail("");
  };

  return (
    <div className="animate-[fadeIn_250ms_ease-out]">
      <PageHeader title="Settings" subtitle="Manage workspace identity, team access, plan usage, and incident notification rules." />

      <section className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={
                activeTab === tab.id
                  ? "shrink-0 rounded-md border-l-2 border-red-500 bg-red-500/10 px-4 py-3 text-left font-mono text-xs uppercase tracking-[0.12em] text-red-600 dark:text-red-300"
                  : "shrink-0 rounded-md border-l-2 border-transparent px-4 py-3 text-left font-mono text-xs uppercase tracking-[0.12em] text-slate-500 transition hover:bg-slate-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-red-300"
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {activeTab === "profile" ? (
            <Card className="space-y-5 p-5">
              <div>
                <MiniLabel>Profile</MiniLabel>
                <h2 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">James Doe</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-red-600 to-red-900 text-lg font-semibold text-white shadow-[0_0_22px_rgba(220,38,38,0.24)]">
                  JD
                </div>
                <div>
                  <button type="button" className="rounded-md border border-slate-200 px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-600 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-slate-300 dark:hover:text-red-300">
                    Change Avatar
                  </button>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">JPG, PNG, or GIF. Max 1MB.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ["Full name", "James Doe"],
                  ["Email", "james@tracepilot.io"],
                  ["Company", "TracePilot Inc."],
                  ["Role", "Owner"]
                ].map(([label, value]) => (
                  <label key={label} className="block">
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-slate-500">{label}</span>
                    <input
                      defaultValue={value}
                      className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-red-400 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                    />
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSaved(true);
                    window.setTimeout(() => setSaved(false), 1600);
                  }}
                  className={saved ? "rounded-md bg-emerald-600 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-white" : "rounded-md bg-red-600 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-white transition hover:bg-red-500"}
                >
                  {saved ? "Saved" : "Save Changes"}
                </button>
                <button type="button" className="rounded-md border border-slate-200 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-slate-400 dark:hover:text-red-300">
                  Cancel
                </button>
              </div>
            </Card>
          ) : null}

          {activeTab === "team" ? (
            <div className="space-y-4">
              <Card className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <UserPlus className="text-red-500" size={18} />
                  <h2 className="font-semibold text-slate-950 dark:text-white">Invite Member</h2>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") invite();
                    }}
                    placeholder="colleague@company.com"
                    className="min-h-10 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                  />
                  <button type="button" onClick={invite} className="rounded-md bg-red-600 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-white transition hover:bg-red-500">
                    Send Invite
                  </button>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
                  <MiniLabel>Team Members</MiniLabel>
                  <Badge>{members.length} Members</Badge>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-white/10">
                  {members.map((member, index) => (
                    <div key={`${member.email}-${index}`} className="flex items-center gap-3 px-5 py-4">
                      <div className={member.active ? "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-600 text-sm font-semibold text-white" : "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-200 text-sm font-semibold text-slate-500 dark:bg-white/10"}>
                        {member.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900 dark:text-white">{member.name}</p>
                        <p className="truncate text-sm text-slate-500 dark:text-slate-500">{member.email}</p>
                      </div>
                      <Badge tone={member.role === "Owner" ? "red" : member.role === "Admin" ? "amber" : "blue"}>{member.role}</Badge>
                      {!member.active ? <Badge tone="slate">Pending</Badge> : null}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ) : null}

          {activeTab === "subscription" ? (
            <div className="space-y-4">
              <Card glow className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <MiniLabel>Current Plan</MiniLabel>
                    <p className="mt-2 text-4xl font-semibold text-red-600 dark:text-red-300">Pro</p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Billed monthly · Renews January 15, 2027</p>
                  </div>
                  <p className="text-4xl font-semibold text-slate-950 dark:text-white">$79<span className="text-sm text-slate-500">/mo</span></p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {["Unlimited analyses", "ZIP bulk", "Slack + Webhooks", "Audit export", "Priority support"].map((feature) => (
                    <Badge key={feature} tone="green">{feature}</Badge>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <MiniLabel>Usage This Month</MiniLabel>
                <div className="mt-4 space-y-4">
                  {[
                    { label: "Analyses", value: 847, max: null },
                    { label: "ZIP Jobs", value: 24, max: 25 },
                    { label: "API Calls", value: 12400, max: 50000 }
                  ].map((usage) => (
                    <div key={usage.label}>
                      <div className="mb-1 flex justify-between text-sm text-slate-600 dark:text-slate-400">
                        <span>{usage.label}</span>
                        <span className="font-mono">{usage.max ? `${usage.value.toLocaleString()} / ${usage.max.toLocaleString()}` : "Unlimited"}</span>
                      </div>
                      {usage.max ? (
                        <div className="h-2 overflow-hidden rounded bg-slate-200 dark:bg-white/10">
                          <div className={usage.value / usage.max > 0.85 ? "h-full rounded bg-red-500" : "h-full rounded bg-emerald-400"} style={{ width: `${(usage.value / usage.max) * 100}%` }} />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ) : null}

          {activeTab === "notifications" ? (
            <Card className="p-5">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck className="text-red-500" size={18} />
                <h2 className="font-semibold text-slate-950 dark:text-white">Notification Rules</h2>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-white/10">
                {[
                  ["critical", "Critical incident detected", "Notify immediately when critical severity is identified."],
                  ["high", "High severity incidents", "Notify for high severity findings from the pipeline."],
                  ["digest", "Weekly digest", "Summarize incident trends every Monday."],
                  ["remediation", "Remediation reminders", "Follow up on open remediation actions."],
                  ["connectors", "Connector activity", "Notify when platforms trigger ingestion."]
                ].map(([key, title, description]) => {
                  const enabled = notifications[key as keyof typeof notifications];
                  return (
                    <div key={key} className="flex items-start justify-between gap-4 py-4">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{title}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        onClick={() => setNotifications((current) => ({ ...current, [key]: !enabled }))}
                        className={enabled ? "relative h-6 w-11 shrink-0 rounded-full bg-red-600" : "relative h-6 w-11 shrink-0 rounded-full bg-slate-200 dark:bg-white/10"}
                      >
                        <span className={enabled ? "absolute left-[22px] top-1 h-4 w-4 rounded-full bg-white transition" : "absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition"} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}
        </div>
      </section>
    </div>
  );
}
