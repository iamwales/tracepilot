import { AGENT_STAGES, type AgentStageId } from "./agents";
import { createIncidentDraft, type IncidentInput } from "./schema";
import type { Json } from "@/lib/db/types";
import type { AgentRun, IncidentAnalysis, Severity } from "./types";

const CRITICAL_TERMS = ["outage", "critical", "unavailable", "data loss", "security", "breach"];
const HIGH_TERMS = ["timeout", "failed", "error", "refused", "saturation", "degraded", "latency"];

export function runIncidentAgents(input: IncidentInput, now = new Date()): IncidentAnalysis {
  const draft = createIncidentDraft(input, now);
  const severity = inferSeverity(input.description, draft.signalCount);
  const evidence = extractEvidence(input.description);
  const rootCauses = inferRootCauses(input.description);
  const actions = buildActions(severity, rootCauses);
  const confidence = Math.min(0.95, 0.52 + draft.signalCount * 0.06 + evidence.length * 0.03);
  const summary = `${input.title}: ${severity.toUpperCase()} incident with ${draft.signalCount} detected operational signals from ${input.source}.`;
  const report = buildReport({
    title: input.title,
    severity,
    confidence,
    summary,
    evidence,
    rootCauses,
    actions
  });

  const stages = AGENT_STAGES.map((stage, index) =>
    createStageRun(stage.id, draft.fingerprint, index, now, {
      stage: stage.name,
      summary: stageOutput(stage.id, { severity, confidence, evidence, rootCauses, actions, report })
    })
  );

  return {
    summary,
    severity,
    confidence,
    evidence,
    rootCauses,
    actions,
    report,
    stages
  };
}

export function inferSeverity(text: string, signalCount: number): Severity {
  const lower = text.toLowerCase();
  if (CRITICAL_TERMS.some((term) => lower.includes(term)) && signalCount >= 4) return "critical";
  if (signalCount >= 5 || HIGH_TERMS.filter((term) => lower.includes(term)).length >= 3) return "high";
  if (signalCount >= 2) return "medium";
  return "low";
}

export function extractEvidence(text: string): string[] {
  return text
    .split(/[\n.]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /\b(error|failed|timeout|latency|degraded|unavailable|refused|saturation|exception|critical)\b/i.test(line))
    .slice(0, 5);
}

export function inferRootCauses(text: string): string[] {
  const lower = text.toLowerCase();
  const causes: string[] = [];

  if (lower.includes("deploy") || lower.includes("release")) {
    causes.push("Recent deployment introduced a regression or changed service behavior.");
  }
  if (lower.includes("database") || lower.includes("connection pool") || lower.includes("refused")) {
    causes.push("Database connectivity or connection pool saturation is limiting request throughput.");
  }
  if (lower.includes("payment") || lower.includes("checkout")) {
    causes.push("Customer-facing checkout or payment dependency is failing under load.");
  }
  if (lower.includes("latency") || lower.includes("timeout")) {
    causes.push("Upstream latency is causing retries, timeouts, and cascading pressure.");
  }

  return causes.length ? causes.slice(0, 4) : ["Insufficient evidence for a confident root cause; collect service metrics and recent change history."];
}

export function buildActions(severity: Severity, rootCauses: string[]): string[] {
  const actions = [
    "Assign an incident commander and capture the current customer impact.",
    "Compare error rate, latency, and deploy timeline for the affected service.",
    "Preserve relevant logs, traces, dashboards, and alerts for post-incident review."
  ];

  if (severity === "high" || severity === "critical") {
    actions.unshift("Start mitigation immediately and prepare rollback or traffic-shift options.");
  }
  if (rootCauses.some((cause) => cause.toLowerCase().includes("database"))) {
    actions.push("Inspect database connection pool limits, slow queries, and saturation metrics.");
  }
  if (rootCauses.some((cause) => cause.toLowerCase().includes("deployment"))) {
    actions.push("Review the latest deployment diff and rollback if mitigation is not clear within the response window.");
  }

  return actions.slice(0, 6);
}

function createStageRun(stage: AgentStageId, fingerprint: string, index: number, now: Date, output: Record<string, Json>): AgentRun {
  return {
    id: `${fingerprint}_${stage}`,
    incidentId: fingerprint,
    stage,
    status: "completed",
    output,
    createdAt: new Date(now.getTime() + index * 1000).toISOString()
  };
}

function stageOutput(
  stage: AgentStageId,
  result: Pick<IncidentAnalysis, "severity" | "confidence" | "evidence" | "rootCauses" | "actions" | "report">
) {
  switch (stage) {
    case "intake":
      return `${result.evidence.length} evidence lines extracted and normalized.`;
    case "severity":
      return `Severity scored as ${result.severity} with ${Math.round(result.confidence * 100)}% confidence.`;
    case "rootCause":
      return result.rootCauses[0];
    case "remediation":
      return result.actions[0];
    case "report":
      return "Incident report generated for sharing.";
  }
}

function buildReport(details: {
  title: string;
  severity: Severity;
  confidence: number;
  summary: string;
  evidence: string[];
  rootCauses: string[];
  actions: string[];
}) {
  return [
    `# ${details.title}`,
    "",
    `Severity: ${details.severity.toUpperCase()}`,
    `Confidence: ${Math.round(details.confidence * 100)}%`,
    "",
    "## Summary",
    details.summary,
    "",
    "## Evidence",
    ...details.evidence.map((item) => `- ${item}`),
    "",
    "## Likely Root Cause",
    ...details.rootCauses.map((item) => `- ${item}`),
    "",
    "## Recommended Actions",
    ...details.actions.map((item) => `- ${item}`)
  ].join("\n");
}
