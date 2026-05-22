import type { Json } from "@/lib/supabase/types";
import type { AgentStageId } from "./agents";
import type { GuardrailResult } from "./guardrails";

export type IncidentStatus = "draft" | "running" | "completed" | "failed";
export type Severity = "low" | "medium" | "high" | "critical";
export type AnalysisProvider = "deterministic" | "openrouter";

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number | null;
};

export type GuardrailMetadata = {
  input: GuardrailResult;
  output: GuardrailResult;
};

export type ObservabilityMetadata = {
  traceId: string;
  openaiTracingEnabled: boolean;
  langfuseEnabled: boolean;
};

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
  provider?: AnalysisProvider;
  model?: string;
  tokenUsage?: TokenUsage;
  guardrails?: GuardrailMetadata;
  observability?: ObservabilityMetadata;
};

export type CreateIncidentResponse = {
  incident: IncidentRecord;
};
