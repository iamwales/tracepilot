import type { Json } from "@/lib/supabase/types";
import type { AgentStageId } from "./agents";

export type IncidentStatus = "draft" | "running" | "completed" | "failed";
export type Severity = "low" | "medium" | "high" | "critical";

export type AgentRun = {
  id: string;
  incidentId: string;
  stage: AgentStageId;
  status: "completed";
  output: Record<string, Json>;
  createdAt: string;
};

export type IncidentRecord = {
  id: string;
  userId: string;
  title: string;
  source: string;
  description: string;
  status: IncidentStatus;
  severity: Severity;
  analysis: IncidentAnalysis;
  createdAt: string;
};

export type IncidentAnalysis = {
  summary: string;
  severity: Severity;
  confidence: number;
  rootCauses: string[];
  evidence: string[];
  actions: string[];
  report: string;
  stages: AgentRun[];
};

export type CreateIncidentResponse = {
  incident: IncidentRecord;
};
