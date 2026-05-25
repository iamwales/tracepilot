import { connectors, teamMembers } from "@/components/dashboard/data";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import type {
  ConnectorPatch,
  ConnectorRecord,
  NotificationSettings,
  ProfileSettings,
  SubscriptionSettings,
  TeamMemberRecord
} from "./types";

const memory = {
  connectors: new Map<string, ConnectorRecord[]>(),
  profiles: new Map<string, ProfileSettings>(),
  notifications: new Map<string, NotificationSettings>(),
  subscriptions: new Map<string, SubscriptionSettings>(),
  team: new Map<string, TeamMemberRecord[]>()
};

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
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

function defaultProfile(userId: string): ProfileSettings {
  return {
    userId,
    fullName: "James Doe",
    email: "james@tracepilot.io",
    company: "TracePilot Inc.",
    role: "Owner",
    updatedAt: now()
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
  return {
    userId,
    plan: "pro",
    status: "active",
    renewsAt: "2027-01-15T00:00:00.000Z",
    usage: {
      analyses: 0,
      apiCalls: 0
    },
    updatedAt: now()
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

export async function listConnectors(userId: string): Promise<ConnectorRecord[]> {
  if (!hasSupabaseConfig()) {
    const existing = memory.connectors.get(userId) ?? defaultConnectors(userId);
    memory.connectors.set(userId, existing);
    return existing;
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("connector_configs").select("*").eq("clerk_user_id", userId).order("name");
  if (error) throw new Error(error.message);
  if (data?.length) return data.map(mapConnectorRow);

  const seeded = defaultConnectors(userId);
  const { error: insertError } = await supabase.from("connector_configs").insert(
    seeded.map((connector) => ({
      clerk_user_id: userId,
      connector_id: connector.id,
      name: connector.name,
      category: connector.category,
      description: connector.description,
      connected: connector.connected,
      token_configured: connector.tokenConfigured,
      webhook_url: connector.webhookUrl
    }))
  );
  if (insertError) throw new Error(insertError.message);
  return seeded;
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
  return updated;
}

export async function getProfile(userId: string): Promise<ProfileSettings> {
  if (!hasSupabaseConfig()) {
    const existing = memory.profiles.get(userId) ?? defaultProfile(userId);
    memory.profiles.set(userId, existing);
    return existing;
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("user_settings").select("*").eq("clerk_user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return mapProfileRow(data);

  const profile = defaultProfile(userId);
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
  if (!hasSupabaseConfig()) {
    const existing = memory.subscriptions.get(userId) ?? defaultSubscription(userId);
    memory.subscriptions.set(userId, existing);
    return existing;
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("subscriptions").select("*").eq("clerk_user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return mapSubscriptionRow(data);

  const defaults = defaultSubscription(userId);
  const { error: insertError } = await supabase.from("subscriptions").insert({
    clerk_user_id: userId,
    plan: defaults.plan,
    status: defaults.status,
    renews_at: defaults.renewsAt,
    usage: defaults.usage as unknown as Json
  });
  if (insertError) throw new Error(insertError.message);
  return defaults;
}

export async function updateSubscriptionPlan(userId: string, plan: SubscriptionSettings["plan"]): Promise<SubscriptionSettings> {
  const current = await getSubscription(userId);
  const updated = { ...current, plan, status: "active" as const, updatedAt: now() };

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
  if (!hasSupabaseConfig()) {
    const existing = memory.team.get(userId) ?? defaultTeam(userId);
    memory.team.set(userId, existing);
    return existing;
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("team_members").select("*").eq("clerk_user_id", userId).order("invited_at");
  if (error) throw new Error(error.message);
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
  if (insertError) throw new Error(insertError.message);
  return seeded;
}

export async function inviteTeamMember(userId: string, email: string, role: "Admin" | "Member"): Promise<TeamMemberRecord> {
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
    const existing = await listTeamMembers(userId);
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
  if (error) throw new Error(error.message);
  return member;
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
  return {
    userId: row.clerk_user_id,
    plan: row.plan,
    status: row.status,
    renewsAt: row.renews_at,
    usage: row.usage,
    updatedAt: row.updated_at
  };
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
