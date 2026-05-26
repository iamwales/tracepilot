"use client";

import { useEffect, useState } from "react";
import { CreditCard, Lock, ShieldCheck, UserPlus, X } from "lucide-react";
import { teamMembers as initialMembers } from "@/components/dashboard/data";
import { Badge, Card, MiniLabel, PageHeader } from "@/components/dashboard/ui";
import type { TeamMember } from "@/components/dashboard/types";
import { planDetails } from "@/features/dashboard/plans";
import type { NotificationSettings, ProfileSettings, SubscriptionSettings, TeamMemberRecord } from "@/features/dashboard/types";

type SettingsTab = "profile" | "team" | "subscription" | "notifications";

const tabs: Array<{ id: SettingsTab; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "team", label: "Team" },
  { id: "subscription", label: "Subscription" },
  { id: "notifications", label: "Notifications" }
];

const notificationRules: Array<{
  key: keyof Pick<NotificationSettings, "critical" | "high" | "digest" | "remediation" | "connectors">;
  title: string;
  description: string;
}> = [
  { key: "critical", title: "Critical incident detected", description: "Notify immediately when critical severity is identified." },
  { key: "high", title: "High severity incidents", description: "Notify for high severity findings from the pipeline." },
  { key: "digest", title: "Weekly digest", description: "Summarize incident trends every Monday." },
  { key: "remediation", title: "Remediation reminders", description: "Follow up on open remediation actions." },
  { key: "connectors", title: "Connector activity", description: "Notify when platforms trigger ingestion." }
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [members, setMembers] = useState<Array<TeamMember | TeamMemberRecord>>(initialMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"Admin" | "Member">("Member");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<SubscriptionSettings["plan"] | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentCard, setPaymentCard] = useState({
    number: "4242 4242 4242 4242",
    expiry: "12 / 34",
    cvc: "123",
    name: "TracePilot Test"
  });
  const [profile, setProfile] = useState<ProfileSettings>({
    userId: "",
    fullName: "",
    email: "",
    company: "",
    role: "",
    updatedAt: ""
  });
  const [subscription, setSubscription] = useState<SubscriptionSettings>({
    userId: "",
    plan: "pro",
    status: "active",
    renewsAt: "2027-01-15T00:00:00.000Z",
    provider: "local",
    providerSubscriptionId: null,
    planName: "Pro",
    amountUsd: 20,
    usage: { analyses: 0, apiCalls: 0 },
    updatedAt: ""
  });
  const [notifications, setNotifications] = useState<NotificationSettings>({
    userId: "",
    critical: true,
    high: true,
    digest: false,
    remediation: true,
    connectors: false,
    updatedAt: ""
  });

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/settings").then(async (response) => ({ response, payload: await response.json() })),
      fetch("/api/team").then(async (response) => ({ response, payload: await response.json() })),
      fetch("/api/notifications").then(async (response) => ({ response, payload: await response.json() })),
      fetch("/api/subscription").then(async (response) => ({ response, payload: await response.json() }))
    ])
      .then(([profileResult, teamResult, notificationResult, subscriptionResult]) => {
        for (const result of [profileResult, teamResult, notificationResult, subscriptionResult]) {
          if (!result.response.ok) throw new Error(result.payload.error || "Could not load settings.");
        }
        if (!active) return;
        setProfile(profileResult.payload.profile);
        setMembers(teamResult.payload.members);
        setNotifications(notificationResult.payload.notifications);
        setSubscription(subscriptionResult.payload.subscription);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load settings.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const saveProfile = async () => {
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save profile.");
      setProfile(payload.profile);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save profile.");
    }
  };

  const invite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    try {
      setError(null);
      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not invite member.");
      setMembers((current) => [...current, payload.member]);
      setInviteEmail("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not invite member.");
    }
  };

  const saveNotifications = async (next: NotificationSettings) => {
    setNotifications(next);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save notification settings.");
      setNotifications(payload.notifications);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save notification settings.");
    }
  };

  const changeFreePlan = async (plan: SubscriptionSettings["plan"]) => {
    try {
      setProcessingPayment(true);
      setError(null);
      const response = await fetch("/api/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not update subscription.");
      setSubscription(payload.subscription);
      setPendingPlan(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update subscription.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const openPlanCheckout = async (plan: SubscriptionSettings["plan"]) => {
    if (plan === subscription.plan) return;
    setError(null);
    if (planDetails[plan].amountUsd === 0) {
      await changeFreePlan(plan);
      return;
    }
    setPendingPlan(plan);
  };

  const confirmPlanChange = async () => {
    if (!pendingPlan) return;
    const cardDigits = paymentCard.number.replace(/\D/g, "");
    if (cardDigits.length < 16) {
      setError("Enter a valid Clerk test card number.");
      return;
    }
    try {
      setProcessingPayment(true);
      setError(null);
      const response = await fetch("/api/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: pendingPlan,
          payment: {
            testMode: true,
            last4: cardDigits.slice(-4)
          }
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not update subscription.");
      setSubscription(payload.subscription);
      setPendingPlan(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update subscription.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const pendingPlanDetails = pendingPlan ? planDetails[pendingPlan] : null;

  return (
    <div className="animate-[fadeIn_250ms_ease-out]">
      <PageHeader title="Settings" subtitle="Manage workspace identity, team access, plan usage, and incident notification rules." />
      {error ? <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200">{error}</div> : null}

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
            loading ? <ProfileSkeleton /> : <Card className="space-y-5 p-5">
              <div>
                <MiniLabel>Profile</MiniLabel>
                <h2 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{profile.fullName}</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-red-600 to-red-900 text-lg font-semibold text-white shadow-[0_0_22px_rgba(220,38,38,0.24)]">
                  {getInitials(profile.fullName, profile.email)}
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
                  ["Full name", "fullName"],
                  ["Email", "email"],
                  ["Company", "company"],
                  ["Role", "role"]
                ].map(([label, key]) => (
                  <label key={label} className="block">
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-slate-500">{label}</span>
                    <input
                      value={String(profile[key as keyof ProfileSettings] ?? "")}
                      onChange={(event) => setProfile((current) => ({ ...current, [key]: event.target.value }))}
                      className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-red-400 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                    />
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveProfile}
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
                  <select
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value as "Admin" | "Member")}
                    className="min-h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-red-400 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                    aria-label="Invite role"
                  >
                    <option value="Member">Member</option>
                    <option value="Admin">Admin</option>
                  </select>
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
                    <p className="mt-2 text-4xl font-semibold capitalize text-red-600 dark:text-red-300">{subscription.planName || subscription.plan}</p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Status {subscription.status} · {subscription.renewsAt ? `Renews ${new Date(subscription.renewsAt).toLocaleDateString()}` : "No renewal date"}
                    </p>
                  </div>
                  <p className="text-4xl font-semibold text-slate-950 dark:text-white">
                    {formatPlanPrice(subscription)}
                    {subscription.plan !== "enterprise" ? <span className="text-sm text-slate-500">/mo</span> : null}
                  </p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge tone={subscription.provider === "clerk" ? "blue" : "slate"}>
                    {subscription.provider === "clerk" ? "Managed by Clerk" : "Local Plan"}
                  </Badge>
                  <Badge tone="green">{planDetails[subscription.plan].incidentLimit.toLocaleString()} incidents / month</Badge>
                  {["Slack + Webhooks", "Audit export", "Priority support"].map((feature) => (
                    <Badge key={feature} tone="green">{feature}</Badge>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <MiniLabel>Plans</MiniLabel>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {(["starter", "pro", "enterprise"] as const).map((plan) => (
                    <button
                      key={plan}
                      type="button"
                      onClick={() => openPlanCheckout(plan)}
                      className={subscription.plan === plan ? "rounded-md border border-red-500 bg-red-500/10 px-4 py-3 text-left text-red-600 dark:text-red-300" : "rounded-md border border-slate-200 px-4 py-3 text-left text-slate-600 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-slate-300"}
                    >
                      <span className="block font-mono text-xs uppercase tracking-[0.14em]">{planDetails[plan].name}</span>
                      <span className="mt-1 block text-lg font-semibold text-slate-950 dark:text-white">
                        {planDetails[plan].priceLabel}
                        {plan !== "enterprise" ? <span className="text-xs font-normal text-slate-500">/mo</span> : null}
                      </span>
                      <span className="mt-1 block text-sm">{planDetails[plan].incidentLimit.toLocaleString()} incidents / month</span>
                      <span className="mt-1 block text-sm">
                        {subscription.plan === plan ? "Current plan" : planDetails[plan].amountUsd === 0 ? "Switch for free" : "Switch plan"}
                      </span>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <MiniLabel>Usage This Month</MiniLabel>
                <div className="mt-4 space-y-4">
                  {[
                    { label: "Incidents", value: subscription.usage.analyses, max: planDetails[subscription.plan].incidentLimit },
                    { label: "API Calls", value: subscription.usage.apiCalls, max: 50000 }
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
                {notificationRules.map(({ key, title, description }) => {
                  const enabled = notifications[key];
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
                        onClick={() => saveNotifications({ ...notifications, [key]: !enabled })}
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

      {pendingPlan && pendingPlanDetails ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <div>
                <MiniLabel>Clerk Test Checkout</MiniLabel>
                <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{pendingPlanDetails.name} plan</h2>
              </div>
              <button
                type="button"
                onClick={() => setPendingPlan(null)}
                className="grid h-9 w-9 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Close checkout"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-md border border-slate-200 p-4 dark:border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-white">{pendingPlanDetails.priceLabel}{pendingPlan !== "enterprise" ? "/mo" : ""}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{pendingPlanDetails.incidentLimit.toLocaleString()} incidents per month</p>
                  </div>
                  <Badge tone="blue">Test mode</Badge>
                </div>
              </div>

              <label className="block">
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-slate-500">Card number</span>
                <div className="mt-2 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-950">
                  <CreditCard size={16} className="text-slate-400" />
                  <input
                    value={paymentCard.number}
                    onChange={(event) => setPaymentCard((current) => ({ ...current, number: formatCardNumber(event.target.value) }))}
                    className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none dark:text-white"
                    inputMode="numeric"
                  />
                </div>
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block sm:col-span-1">
                  <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-slate-500">Expiry</span>
                  <input
                    value={paymentCard.expiry}
                    onChange={(event) => setPaymentCard((current) => ({ ...current, expiry: event.target.value }))}
                    className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-400 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                    inputMode="numeric"
                  />
                </label>
                <label className="block sm:col-span-1">
                  <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-slate-500">CVC</span>
                  <input
                    value={paymentCard.cvc}
                    onChange={(event) => setPaymentCard((current) => ({ ...current, cvc: event.target.value.replace(/\D/g, "").slice(0, 4) }))}
                    className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-400 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                    inputMode="numeric"
                  />
                </label>
                <label className="block sm:col-span-1">
                  <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-slate-500">ZIP</span>
                  <input
                    defaultValue="94107"
                    className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-400 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                    inputMode="numeric"
                  />
                </label>
              </div>

              <label className="block">
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-slate-500">Name on card</span>
                <input
                  value={paymentCard.name}
                  onChange={(event) => setPaymentCard((current) => ({ ...current, name: event.target.value }))}
                  className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-400 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                />
              </label>

              <div className="flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-400">
                <Lock size={14} />
                <span>Clerk test card accepts 4242 4242 4242 4242 with any future expiry.</span>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPendingPlan(null)}
                  className="rounded-md border border-slate-200 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-slate-400 dark:hover:text-red-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmPlanChange}
                  disabled={processingPayment}
                  className="rounded-md bg-red-600 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processingPayment ? "Processing" : "Confirm Plan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <Card className="space-y-5 p-5">
      <div className="animate-pulse">
        <div className="h-3 w-16 rounded bg-slate-200 dark:bg-white/10" />
        <div className="mt-3 h-7 w-48 rounded bg-slate-200 dark:bg-white/10" />
      </div>
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
        <div className="space-y-2">
          <div className="h-9 w-32 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
          <div className="h-3 w-40 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-white/10" />
            <div className="mt-2 h-10 rounded bg-slate-200 dark:bg-white/10" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function getInitials(name: string, email: string) {
  const source = name.trim() || email.trim();
  const parts = source.includes("@") ? [source[0]] : source.split(/\s+/);
  return parts
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatPlanPrice(subscription: SubscriptionSettings) {
  if (subscription.plan === "enterprise") return planDetails.enterprise.priceLabel;
  if (typeof subscription.amountUsd === "number") return `$${subscription.amountUsd}`;
  return planDetails[subscription.plan].priceLabel;
}

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();
}
