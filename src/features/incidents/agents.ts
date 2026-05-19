import type { IncidentDraft } from "./schema";

export type AgentStageId = "intake" | "severity" | "rootCause" | "remediation" | "report";

export type AgentStage = {
  id: AgentStageId;
  name: string;
  role: string;
  output: string;
};

export const AGENT_STAGES: AgentStage[] = [
  {
    id: "intake",
    name: "Intake Agent",
    role: "Structures noisy incident input into a reliable working record.",
    output: "Clean incident brief"
  },
  {
    id: "severity",
    name: "Severity Agent",
    role: "Estimates impact, urgency, and customer risk from available signals.",
    output: "Severity and confidence"
  },
  {
    id: "rootCause",
    name: "Root Cause Agent",
    role: "Builds evidence-grounded hypotheses and flags missing context.",
    output: "Ranked cause hypotheses"
  },
  {
    id: "remediation",
    name: "Remediation Agent",
    role: "Turns findings into immediate response steps and owner-ready actions.",
    output: "Action plan"
  },
  {
    id: "report",
    name: "Report Agent",
    role: "Compiles the final incident narrative for sharing and review.",
    output: "Executive report"
  }
];

export type PreviewAssessment = {
  status: "ready";
  severityHint: "low" | "medium" | "high";
  confidence: number;
  summary: string;
};

export function buildPreviewAssessment(draft: IncidentDraft): PreviewAssessment {
  const severityHint = draft.signalCount >= 5 ? "high" : draft.signalCount >= 2 ? "medium" : "low";
  const confidence = Math.min(0.92, 0.48 + draft.signalCount * 0.07);
  return {
    status: "ready",
    severityHint,
    confidence,
    summary: `${draft.signalCount} operational signal${draft.signalCount === 1 ? "" : "s"} detected. Ready for the multi-agent pipeline.`
  };
}
