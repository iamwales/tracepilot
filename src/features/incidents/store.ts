import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import type { IncidentAnalysis, IncidentRecord } from "./types";

const memoryStore = new Map<string, IncidentRecord>();
const memoryChatStore = new Map<string, IncidentChatMessage[]>();

export type IncidentChatMessage = {
  id: string;
  userId: string;
  incidentId: string;
  role: "user" | "assistant";
  content: string;
  provider: string | null;
  model: string | null;
  createdAt: string;
};

export type IncidentChatMessageInput = {
  userId: string;
  incidentId: string;
  role: "user" | "assistant";
  content: string;
  provider?: string | null;
  model?: string | null;
};

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function saveIncident(record: IncidentRecord): Promise<IncidentRecord> {
  if (!hasSupabaseConfig()) {
    memoryStore.set(record.id, record);
    return record;
  }

  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("incidents").insert({
    id: record.id,
    clerk_user_id: record.userId,
    title: record.title,
    source: record.source,
    description: record.description,
    status: record.status,
    severity: record.severity,
    analysis: record.analysis as unknown as Json
  });

  if (error) throw new Error(error.message);

  const runs = record.analysis.stages.map((stage) => ({
    id: stage.id,
    incident_id: record.id,
    stage: stage.stage,
    status: stage.status,
    output: stage.output,
    created_at: stage.createdAt
  }));
  const { error: runError } = await supabase.from("agent_runs").insert(runs);
  if (runError) throw new Error(runError.message);

  return record;
}

export async function listIncidents(userId: string): Promise<IncidentRecord[]> {
  if (!hasSupabaseConfig()) {
    return Array.from(memoryStore.values())
      .filter((record) => record.userId === userId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .eq("clerk_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.clerk_user_id,
    title: row.title,
    source: row.source,
    description: row.description,
    status: row.status,
    severity: row.severity,
    analysis: row.analysis as IncidentAnalysis,
    createdAt: row.created_at
  }));
}

export async function countMonthlyIncidents(userId: string, now = new Date()): Promise<number> {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  if (!hasSupabaseConfig()) {
    return Array.from(memoryStore.values()).filter((record) => {
      const createdAt = new Date(record.createdAt);
      return record.userId === userId && createdAt >= monthStart && createdAt < nextMonthStart;
    }).length;
  }

  const supabase = createServiceSupabaseClient();
  const { count, error } = await supabase
    .from("incidents")
    .select("id", { count: "exact", head: true })
    .eq("clerk_user_id", userId)
    .gte("created_at", monthStart.toISOString())
    .lt("created_at", nextMonthStart.toISOString());

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getIncident(userId: string, id: string): Promise<IncidentRecord | null> {
  if (!hasSupabaseConfig()) {
    const record = memoryStore.get(id);
    return record?.userId === userId ? record : null;
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .eq("id", id)
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    userId: data.clerk_user_id,
    title: data.title,
    source: data.source,
    description: data.description,
    status: data.status,
    severity: data.severity,
    analysis: data.analysis as IncidentAnalysis,
    createdAt: data.created_at
  };
}

export async function listIncidentChatMessages(userId: string, incidentId: string): Promise<IncidentChatMessage[]> {
  if (!hasSupabaseConfig()) {
    return [...(memoryChatStore.get(chatKey(userId, incidentId)) ?? [])].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt)
    );
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("incident_chat_messages")
    .select("*")
    .eq("clerk_user_id", userId)
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapChatMessageRow);
}

export async function appendIncidentChatMessage(input: IncidentChatMessageInput): Promise<IncidentChatMessage> {
  const message: IncidentChatMessage = {
    id: crypto.randomUUID(),
    userId: input.userId,
    incidentId: input.incidentId,
    role: input.role,
    content: input.content,
    provider: input.provider ?? null,
    model: input.model ?? null,
    createdAt: new Date().toISOString()
  };

  if (!hasSupabaseConfig()) {
    const key = chatKey(input.userId, input.incidentId);
    memoryChatStore.set(key, [...(memoryChatStore.get(key) ?? []), message]);
    return message;
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("incident_chat_messages")
    .insert({
      id: message.id,
      clerk_user_id: message.userId,
      incident_id: message.incidentId,
      role: message.role,
      content: message.content,
      provider: message.provider,
      model: message.model,
      created_at: message.createdAt
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapChatMessageRow(data);
}

function chatKey(userId: string, incidentId: string) {
  return `${userId}:${incidentId}`;
}

function mapChatMessageRow(row: {
  id: string;
  clerk_user_id: string;
  incident_id: string;
  role: "user" | "assistant";
  content: string;
  provider: string | null;
  model: string | null;
  created_at: string;
}): IncidentChatMessage {
  return {
    id: row.id,
    userId: row.clerk_user_id,
    incidentId: row.incident_id,
    role: row.role,
    content: row.content,
    provider: row.provider,
    model: row.model,
    createdAt: row.created_at
  };
}
