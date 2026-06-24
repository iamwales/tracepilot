import { createServiceDatabaseClient, hasDatabaseConfig } from "@/lib/db/server";
import type { Json } from "@/lib/db/types";
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

export async function saveIncident(record: IncidentRecord): Promise<IncidentRecord> {
  if (!hasDatabaseConfig()) {
    memoryStore.set(record.id, record);
    return record;
  }

  const db = createServiceDatabaseClient();
  const { error } = await db.from("incidents").insert({
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
  const { error: runError } = await db.from("agent_runs").insert(runs);
  if (runError) throw new Error(runError.message);

  return record;
}

export async function listIncidents(userId: string): Promise<IncidentRecord[]> {
  if (!hasDatabaseConfig()) {
    return Array.from(memoryStore.values())
      .filter((record) => record.userId === userId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  const db = createServiceDatabaseClient();
  const { data, error } = await db
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

  if (!hasDatabaseConfig()) {
    return Array.from(memoryStore.values()).filter((record) => {
      const createdAt = new Date(record.createdAt);
      return record.userId === userId && createdAt >= monthStart && createdAt < nextMonthStart;
    }).length;
  }

  const db = createServiceDatabaseClient();
  const { count, error } = await db
    .from("incidents")
    .select("id", { count: "exact", head: true })
    .eq("clerk_user_id", userId)
    .gte("created_at", monthStart.toISOString())
    .lt("created_at", nextMonthStart.toISOString());

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getIncident(userId: string, id: string): Promise<IncidentRecord | null> {
  if (!hasDatabaseConfig()) {
    const record = memoryStore.get(id);
    return record?.userId === userId ? record : null;
  }

  const db = createServiceDatabaseClient();
  const { data, error } = await db
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
  if (!hasDatabaseConfig()) {
    return [...(memoryChatStore.get(chatKey(userId, incidentId)) ?? [])].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt)
    );
  }

  const db = createServiceDatabaseClient();
  const { data, error } = await db
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

  if (!hasDatabaseConfig()) {
    const key = chatKey(input.userId, input.incidentId);
    memoryChatStore.set(key, [...(memoryChatStore.get(key) ?? []), message]);
    return message;
  }

  const db = createServiceDatabaseClient();
  const { data, error } = await db
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
