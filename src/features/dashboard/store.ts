import { connectors, teamMembers } from "@/components/dashboard/data";
import { countMonthlyIncidents } from "@/features/incidents/store";
import { getClerkUserBillingSnapshot } from "@/lib/clerk/billing";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { planDetails } from "./plans";
import type { Json } from "@/lib/supabase/types";
import type {
  ConnectorPatch,
  ConnectorRecord,
  NotificationSettings,
  ProfileSettings,
  SubscriptionSettings,
  TeamMemberRecord
} from "./types";

type ProfileSeed = Partial<Pick<ProfileSettings, "fullName" | "email">>;
type TeamInviteRole = "Admin" | "Member";
type TeamRole = "Owner" | "Admin" | "Member";
type ClerkClient = Awaited<ReturnType<typeof clerkClient>>;
type ClerkOrganization = Awaited<ReturnType<ClerkClient["organizations"]["getOrganization"]>>;
type ClerkOrganizationMembership = Awaited<ReturnType<ClerkClient["organizations"]["getOrganizationMembershipList"]>>["data"][number];
type ClerkOrganizationInvitation = Awaited<ReturnType<ClerkClient["organizations"]["getOrganizationInvitationList"]>>["data"][number];

const memory = {
  connectors: new Map<string, ConnectorRecord[]>(),
  profiles: new Map<string, ProfileSettings>(),
  notifications: new Map<string, NotificationSettings>(),
  subscriptions: new Map<string, SubscriptionSettings>(),
  team: new Map<string, TeamMemberRecord[]>()
};

const localTeamFallback = new Set<string>();

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function hasClerkConfig() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

function warnDashboardStorageFallback(operation: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown dashboard storage error.";
  console.warn(`[dashboard-storage] Falling back to in-memory ${operation}: ${message}`);
}

function now() {
  return new Date().toISOString();
}

function defaultConnectors(userId: string): ConnectorRecord[] {
  const timestamp = now();
  return connectors.map((connector) => ({
    ...connector,
    userId,
    tokenConfigured: connector.connected,
    webhookUrl: null,
    updatedAt: timestamp
  }));
}

function getMemoryConnectors(userId: string) {
  const existing = memory.connectors.get(userId) ?? defaultConnectors(userId);
  memory.connectors.set(userId, existing);
  return existing;
}

function defaultProfile(userId: string, seed: ProfileSeed = {}): ProfileSettings {
  return {
    userId,
    fullName: seed.fullName || "TracePilot User",
    email: seed.email || "user@tracepilot.io",
    company: "TracePilot Inc.",
    role: "Owner",
    updatedAt: now()
  };
}

function applyProfileSeed(profile: ProfileSettings, seed: ProfileSeed = {}): ProfileSettings {
  return {
    ...profile,
    fullName: seed.fullName || profile.fullName,
    email: seed.email || profile.email
  };
}

function defaultNotifications(userId: string): NotificationSettings {
  return {
    userId,
    critical: true,
    high: true,
    digest: false,
    remediation: true,
    connectors: false,
    updatedAt: now()
  };
}

function defaultSubscription(userId: string): SubscriptionSettings {
  const plan = "pro";
  return {
    userId,
    plan,
    status: "active",
    renewsAt: "2027-01-15T00:00:00.000Z",
    provider: "local",
    providerSubscriptionId: null,
    planName: planDetails[plan].name,
    amountUsd: planDetails[plan].amountUsd,
    usage: {
      analyses: 0,
      apiCalls: 0
    },
    updatedAt: now()
  };
}

function mergeSubscription(
  subscription: SubscriptionSettings,
  clerkSnapshot: Partial<SubscriptionSettings> | null,
  monthlyAnalyses: number
): SubscriptionSettings {
  const usage = {
    ...subscription.usage,
    analyses: monthlyAnalyses
  };
  if (!clerkSnapshot) return { ...subscription, usage };
  return {
    ...subscription,
    ...clerkSnapshot,
    userId: subscription.userId,
    usage,
    updatedAt: subscription.updatedAt
  };
}

function defaultTeam(userId: string): TeamMemberRecord[] {
  const timestamp = now();
  return teamMembers.map((member, index) => ({
    ...member,
    userId,
    id: `${userId}-member-${index}`,
    invitedAt: timestamp
  }));
}

function getMemoryTeam(userId: string) {
  const existing = memory.team.get(userId) ?? defaultTeam(userId);
  memory.team.set(userId, existing);
  return existing;
}

export async function listConnectors(userId: string): Promise<ConnectorRecord[]> {
  if (!hasSupabaseConfig()) {
    return getMemoryConnectors(userId);
  }

  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from("connector_configs").select("*").eq("clerk_user_id", userId).order("name");
    if (error) throw new Error(error.message);
    if (data?.length) return data.map(mapConnectorRow);

    const seeded = defaultConnectors(userId);
    const { error: insertError } = await supabase.from("connector_configs").upsert(
      seeded.map((connector) => ({
        clerk_user_id: userId,
        connector_id: connector.id,
        name: connector.name,
        category: connector.category,
        description: connector.description,
        connected: connector.connected,
        token_configured: connector.tokenConfigured,
        webhook_url: connector.webhookUrl
      })),
      { onConflict: "clerk_user_id,connector_id" }
    );
    if (insertError) throw new Error(insertError.message);
    return seeded;
  } catch (error) {
    warnDashboardStorageFallback("connectors:list", error);
    return getMemoryConnectors(userId);
  }
}

export async function updateConnector(userId: string, id: string, patch: ConnectorPatch): Promise<ConnectorRecord> {
  const existing = await listConnectors(userId);
  const current = existing.find((connector) => connector.id === id);
  if (!current) throw new Error("Connector not found.");

  const updated: ConnectorRecord = {
    ...current,
    connected: patch.connected ?? current.connected,
    tokenConfigured: patch.token ? true : current.tokenConfigured,
    webhookUrl: patch.webhookUrl === undefined ? current.webhookUrl : patch.webhookUrl,
    updatedAt: now()
  };

  if (!hasSupabaseConfig()) {
    memory.connectors.set(
      userId,
      existing.map((connector) => (connector.id === id ? updated : connector))
    );
    return updated;
  }

  try {
    const supabase = createServiceSupabaseClient();
    const { error } = await supabase
      .from("connector_configs")
      .update({
        connected: updated.connected,
        token_configured: updated.tokenConfigured,
        webhook_url: updated.webhookUrl,
        updated_at: updated.updatedAt
      })
      .eq("clerk_user_id", userId)
      .eq("connector_id", id);
    if (error) throw new Error(error.message);
  } catch (error) {
    warnDashboardStorageFallback("connectors:update", error);
    memory.connectors.set(
      userId,
      existing.map((connector) => (connector.id === id ? updated : connector))
    );
  }

  return updated;
}

export async function getProfile(userId: string, seed: ProfileSeed = {}): Promise<ProfileSettings> {
  if (!hasSupabaseConfig()) {
    const existing = memory.profiles.get(userId) ?? defaultProfile(userId, seed);
    const profile = applyProfileSeed(existing, seed);
    memory.profiles.set(userId, profile);
    return profile;
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("user_settings").select("*").eq("clerk_user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (data) {
    const profile = applyProfileSeed(mapProfileRow(data), seed);
    if (profile.fullName !== data.full_name || profile.email !== data.email) {
      await supabase
        .from("user_settings")
        .update({
          full_name: profile.fullName,
          email: profile.email,
          updated_at: now()
        })
        .eq("clerk_user_id", userId);
    }
    return profile;
  }

  const profile = defaultProfile(userId, seed);
  const { error: insertError } = await supabase.from("user_settings").insert({
    clerk_user_id: userId,
    full_name: profile.fullName,
    email: profile.email,
    company: profile.company,
    role: profile.role
  });
  if (insertError) throw new Error(insertError.message);
  return profile;
}

export async function updateProfile(userId: string, profile: Omit<ProfileSettings, "userId" | "updatedAt">): Promise<ProfileSettings> {
  const updated = { ...profile, userId, updatedAt: now() };
  if (!hasSupabaseConfig()) {
    memory.profiles.set(userId, updated);
    return updated;
  }

  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("user_settings").upsert({
    clerk_user_id: userId,
    full_name: updated.fullName,
    email: updated.email,
    company: updated.company,
    role: updated.role,
    updated_at: updated.updatedAt
  });
  if (error) throw new Error(error.message);
  return updated;
}

export async function getNotifications(userId: string): Promise<NotificationSettings> {
  if (!hasSupabaseConfig()) {
    const existing = memory.notifications.get(userId) ?? defaultNotifications(userId);
    memory.notifications.set(userId, existing);
    return existing;
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("notification_preferences").select("*").eq("clerk_user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return mapNotificationRow(data);

  const defaults = defaultNotifications(userId);
  const { error: insertError } = await supabase.from("notification_preferences").insert({
    clerk_user_id: userId,
    critical: defaults.critical,
    high: defaults.high,
    digest: defaults.digest,
    remediation: defaults.remediation,
    connectors: defaults.connectors
  });
  if (insertError) throw new Error(insertError.message);
  return defaults;
}

export async function updateNotifications(
  userId: string,
  settings: Omit<NotificationSettings, "userId" | "updatedAt">
): Promise<NotificationSettings> {
  const updated = { ...settings, userId, updatedAt: now() };
  if (!hasSupabaseConfig()) {
    memory.notifications.set(userId, updated);
    return updated;
  }

  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("notification_preferences").upsert({
    clerk_user_id: userId,
    critical: updated.critical,
    high: updated.high,
    digest: updated.digest,
    remediation: updated.remediation,
    connectors: updated.connectors,
    updated_at: updated.updatedAt
  });
  if (error) throw new Error(error.message);
  return updated;
}

export async function getSubscription(userId: string): Promise<SubscriptionSettings> {
  const [clerkSnapshot, monthlyAnalyses] = await Promise.all([getClerkUserBillingSnapshot(userId), countMonthlyIncidents(userId)]);

  if (!hasSupabaseConfig()) {
    const existing = memory.subscriptions.get(userId) ?? defaultSubscription(userId);
    const merged = mergeSubscription(existing, clerkSnapshot, monthlyAnalyses);
    memory.subscriptions.set(userId, merged);
    return merged;
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("subscriptions").select("*").eq("clerk_user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return mergeSubscription(mapSubscriptionRow(data), clerkSnapshot, monthlyAnalyses);

  const defaults = defaultSubscription(userId);
  const { error: insertError } = await supabase.from("subscriptions").insert({
    clerk_user_id: userId,
    plan: defaults.plan,
    status: defaults.status,
    renews_at: defaults.renewsAt,
    usage: defaults.usage as unknown as Json
  });
  if (insertError) throw new Error(insertError.message);
  return mergeSubscription(defaults, clerkSnapshot, monthlyAnalyses);
}

export async function updateSubscriptionPlan(userId: string, plan: SubscriptionSettings["plan"]): Promise<SubscriptionSettings> {
  const current = await getSubscription(userId);
  const updated = {
    ...current,
    plan,
    status: "active" as const,
    provider: "local" as const,
    providerSubscriptionId: null,
    planName: planDetails[plan].name,
    amountUsd: planDetails[plan].amountUsd,
    updatedAt: now()
  };

  if (!hasSupabaseConfig()) {
    memory.subscriptions.set(userId, updated);
    return updated;
  }

  const supabase = createServiceSupabaseClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ plan: updated.plan, status: updated.status, updated_at: updated.updatedAt })
    .eq("clerk_user_id", userId);
  if (error) throw new Error(error.message);
  return updated;
}

export async function listTeamMembers(userId: string): Promise<TeamMemberRecord[]> {
  if (hasClerkConfig() && !localTeamFallback.has(userId)) {
    return listClerkTeamMembers(userId);
  }

  if (!hasSupabaseConfig()) {
    return getMemoryTeam(userId);
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("team_members").select("*").eq("clerk_user_id", userId).order("invited_at");
  if (error) {
    warnDashboardStorageFallback("team:list-local-members", new Error(error.message));
    return getMemoryTeam(userId);
  }
  if (data?.length) return data.map(mapTeamRow);

  const seeded = defaultTeam(userId);
  const { error: insertError } = await supabase.from("team_members").insert(
    seeded.map((member) => ({
      id: member.id,
      clerk_user_id: userId,
      name: member.name,
      email: member.email,
      role: member.role,
      initials: member.initials,
      active: member.active,
      invited_at: member.invitedAt
    }))
  );
  if (insertError) {
    warnDashboardStorageFallback("team:seed-local-members", new Error(insertError.message));
    memory.team.set(userId, seeded);
  }
  return seeded;
}

export async function inviteTeamMember(userId: string, email: string, role: TeamInviteRole): Promise<TeamMemberRecord> {
  if (hasClerkConfig() && !localTeamFallback.has(userId)) {
    try {
      return await inviteClerkTeamMember(userId, email, role);
    } catch (error) {
      if (!isRecoverableClerkTeamError(error)) throw error;
      warnDashboardStorageFallback("team:invite-clerk-member", error);
      localTeamFallback.add(userId);
    }
  }

  return inviteLocalTeamMember(userId, email, role);
}

async function inviteLocalTeamMember(userId: string, email: string, role: TeamInviteRole): Promise<TeamMemberRecord> {
  let existing: TeamMemberRecord[];
  try {
    existing = await listTeamMembers(userId);
  } catch (error) {
    warnDashboardStorageFallback("team:list-local-before-invite", error);
    existing = getMemoryTeam(userId);
  }

  const duplicate = existing.find((member) => member.email.toLowerCase() === email.toLowerCase());
  if (duplicate) throw new Error("That user is already a member of this team.");

  const member: TeamMemberRecord = {
    userId,
    id: crypto.randomUUID(),
    name: email.split("@")[0],
    email,
    role,
    initials: email.slice(0, 2).toUpperCase(),
    active: false,
    invitedAt: now()
  };

  if (!hasSupabaseConfig()) {
    memory.team.set(userId, [...existing, member]);
    return member;
  }

  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("team_members").insert({
    id: member.id,
    clerk_user_id: userId,
    name: member.name,
    email: member.email,
    role: member.role,
    initials: member.initials,
    active: member.active,
    invited_at: member.invitedAt
  });
  if (error) {
    warnDashboardStorageFallback("team:invite-local-member", new Error(error.message));
    memory.team.set(userId, [...existing, member]);
  }
  return member;
}

function isRecoverableClerkTeamError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  if (message.includes("already a member") || message.includes("only owners and admins")) return false;
  return (
    hasClerkApiStatus(error) ||
    message.includes("organization") ||
    message.includes("not enabled") ||
    message.includes("not found") ||
    message.includes("not allowed") ||
    message.includes("missing") ||
    message.includes("invalid") ||
    message.includes("forbidden") ||
    message.includes("unauthorized") ||
    message.includes("bad request")
  );
}

function hasClerkApiStatus(error: Error) {
  const status = (error as Error & { status?: unknown; statusCode?: unknown }).status ?? (error as Error & { statusCode?: unknown }).statusCode;
  return typeof status === "number" && status >= 400;
}

async function listClerkTeamMembers(userId: string): Promise<TeamMemberRecord[]> {
  const client = await clerkClient();
  const organization = await resolveTeamOrganization(client, userId, false).catch((error) => {
    warnDashboardStorageFallback("team:resolve-clerk-organization", error);
    return null;
  });

  if (!organization) {
    return getClerkOwnerFallback(client, userId);
  }

  try {
    const [memberships, invitations] = await Promise.all([
      client.organizations.getOrganizationMembershipList({ organizationId: organization.id, limit: 100, orderBy: "+created_at" }),
      client.organizations.getOrganizationInvitationList({ organizationId: organization.id, status: ["pending"], limit: 100 })
    ]);

    return [
      ...memberships.data.map((membership) => mapClerkMembership(userId, organization, membership)),
      ...invitations.data.map((invitation) => mapClerkInvitation(userId, invitation))
    ];
  } catch (error) {
    warnDashboardStorageFallback("team:list-clerk-members", error);
    return getClerkOwnerFallback(client, userId);
  }
}

async function inviteClerkTeamMember(userId: string, email: string, role: TeamInviteRole): Promise<TeamMemberRecord> {
  const client = await clerkClient();
  const organization = await resolveTeamOrganization(client, userId, true);
  if (!organization) throw new Error("Could not find or create a Clerk organization for this team.");

  const currentMember = await getCurrentClerkMembership(client, organization.id, userId);
  const currentRole = currentMember ? toUiRole(currentMember.role, organization.createdBy, userId) : "Owner";
  if (currentRole === "Member") {
    throw new Error("Only owners and admins can invite team members.");
  }

  const existingMember = await client.organizations.getOrganizationMembershipList({
    organizationId: organization.id,
    emailAddress: [email],
    limit: 1
  });
  if (existingMember.data.length > 0) {
    throw new Error("That user is already a member of this team.");
  }

  const pendingInvitations = await client.organizations.getOrganizationInvitationList({
    organizationId: organization.id,
    status: ["pending"],
    limit: 100
  });
  const existingInvitation = pendingInvitations.data.find((invitation) => invitation.emailAddress.toLowerCase() === email.toLowerCase());
  if (existingInvitation) return mapClerkInvitation(userId, existingInvitation);

  const invitation = await client.organizations.createOrganizationInvitation({
    organizationId: organization.id,
    emailAddress: email,
    role: toClerkRole(role),
    inviterUserId: userId
  });

  return mapClerkInvitation(userId, invitation);
}

async function resolveTeamOrganization(client: ClerkClient, userId: string, createIfMissing: boolean): Promise<ClerkOrganization | null> {
  const session = await auth();
  if (session.orgId) {
    return client.organizations.getOrganization({ organizationId: session.orgId });
  }

  const memberships = await client.users.getOrganizationMembershipList({ userId, limit: 1 });
  const organization = memberships.data[0]?.organization;
  if (organization) return organization;
  if (!createIfMissing) return null;

  const user = await client.users.getUser(userId);
  const company = String(user.publicMetadata?.company || user.unsafeMetadata?.company || "").trim();
  const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress || "";
  const name = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || email || "TracePilot";

  return client.organizations.createOrganization({
    name: company || `${displayUserName(name)} Team`,
    createdBy: userId
  });
}

async function getCurrentClerkMembership(client: ClerkClient, organizationId: string, userId: string): Promise<ClerkOrganizationMembership | null> {
  const memberships = await client.organizations.getOrganizationMembershipList({
    organizationId,
    userId: [userId],
    limit: 1
  });

  return memberships.data[0] ?? null;
}

async function getClerkOwnerFallback(client: ClerkClient, userId: string): Promise<TeamMemberRecord[]> {
  const user = await client.users.getUser(userId);
  const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress || "";
  const name =
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    email ||
    "TracePilot User";

  return [
    {
      userId,
      id: userId,
      name: displayUserName(name),
      email,
      role: "Owner",
      initials: initialsFor(name || email),
      active: true,
      invitedAt: new Date(user.createdAt).toISOString()
    }
  ];
}

function mapConnectorRow(row: any): ConnectorRecord {
  return {
    userId: row.clerk_user_id,
    id: row.connector_id,
    name: row.name,
    category: row.category,
    description: row.description,
    connected: row.connected,
    tokenConfigured: row.token_configured,
    webhookUrl: row.webhook_url,
    updatedAt: row.updated_at
  };
}

function mapProfileRow(row: any): ProfileSettings {
  return {
    userId: row.clerk_user_id,
    fullName: row.full_name,
    email: row.email,
    company: row.company,
    role: row.role,
    updatedAt: row.updated_at
  };
}

function mapNotificationRow(row: any): NotificationSettings {
  return {
    userId: row.clerk_user_id,
    critical: row.critical,
    high: row.high,
    digest: row.digest,
    remediation: row.remediation,
    connectors: row.connectors,
    updatedAt: row.updated_at
  };
}

function mapSubscriptionRow(row: any): SubscriptionSettings {
  const plan = row.plan as SubscriptionSettings["plan"];
  return {
    userId: row.clerk_user_id,
    plan,
    status: row.status,
    renewsAt: row.renews_at,
    provider: "local",
    providerSubscriptionId: null,
    planName: planDetails[plan].name,
    amountUsd: planDetails[plan].amountUsd,
    usage: row.usage,
    updatedAt: row.updated_at
  };
}

function mapClerkMembership(userId: string, organization: ClerkOrganization, membership: ClerkOrganizationMembership): TeamMemberRecord {
  const publicUser = membership.publicUserData;
  const name = displayUserName([publicUser?.firstName, publicUser?.lastName].filter(Boolean).join(" ") || publicUser?.identifier || "Team member");
  const email = publicUser?.identifier || "";

  return {
    userId,
    id: membership.id,
    name,
    email,
    role: toUiRole(membership.role, organization.createdBy, publicUser?.userId),
    initials: initialsFor(name || email),
    active: true,
    invitedAt: new Date(membership.createdAt).toISOString()
  };
}

function mapClerkInvitation(userId: string, invitation: ClerkOrganizationInvitation): TeamMemberRecord {
  const name = displayUserName(invitation.emailAddress.split("@")[0] || invitation.emailAddress);

  return {
    userId,
    id: invitation.id,
    name,
    email: invitation.emailAddress,
    role: toUiRole(invitation.role),
    initials: initialsFor(name || invitation.emailAddress),
    active: false,
    invitedAt: new Date(invitation.createdAt).toISOString()
  };
}

function toClerkRole(role: TeamInviteRole) {
  return role === "Admin" ? "org:admin" : "org:member";
}

function toUiRole(role: string, createdBy?: string, memberUserId?: string | null): TeamRole {
  if (createdBy && memberUserId && createdBy === memberUserId) return "Owner";
  if (role === "org:owner" || role === "owner") return "Owner";
  if (role === "org:admin" || role === "admin") return "Admin";
  return "Member";
}

function displayUserName(value: string) {
  return value
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function initialsFor(nameOrEmail: string) {
  const source = nameOrEmail.trim();
  const parts = source.includes("@") ? [source[0], source.split("@")[1]?.[0]] : source.split(/\s+/);
  return (
    parts
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "TP"
  );
}

function mapTeamRow(row: any): TeamMemberRecord {
  return {
    userId: row.clerk_user_id,
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    initials: row.initials,
    active: row.active,
    invitedAt: row.invited_at
  };
}
