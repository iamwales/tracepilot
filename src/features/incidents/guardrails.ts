import { z } from "zod";
import type { IncidentInput } from "./schema";
import type { IncidentAnalysis } from "./types";

export const guardrailResultSchema = z.object({
  passed: z.boolean(),
  triggered: z.array(z.string()),
  riskLevel: z.enum(["low", "medium", "high"]),
  message: z.string()
});

export type GuardrailResult = z.infer<typeof guardrailResultSchema>;

const PROMPT_INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior|above) instructions/i,
  /system prompt/i,
  /developer message/i,
  /reveal (your )?(instructions|prompt|secrets)/i,
  /you are now/i,
  /act as/i
];

const SECRET_PATTERNS = [
  /-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----/i,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\b[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|API_KEY)[A-Z0-9_]*\s*=\s*['"]?[^'"\s]+/i
];

const UNSAFE_REMEDIATION_PATTERNS = [
  /drop\s+database/i,
  /delete\s+production/i,
  /disable\s+(auth|authentication|firewall|logging)/i,
  /rm\s+-rf\s+\/(?!tmp)/i,
  /rotate\s+all\s+secrets\s+without\s+approval/i
];

export function runInputGuardrails(input: IncidentInput): GuardrailResult {
  const joined = `${input.title}\n${input.description}`;
  const triggered: string[] = [];

  if (PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(joined))) {
    triggered.push("prompt_injection");
  }
  if (SECRET_PATTERNS.some((pattern) => pattern.test(joined))) {
    triggered.push("secret_exposure");
  }

  return {
    passed: triggered.length === 0,
    triggered,
    riskLevel: triggered.includes("secret_exposure") ? "high" : triggered.length ? "medium" : "low",
    message: triggered.length
      ? "Incident input tripped safety guardrails. Remove secrets or instruction-manipulation text before analysis."
      : "Input passed safety guardrails."
  };
}

export function runOutputGuardrails(analysis: IncidentAnalysis): GuardrailResult {
  const triggered: string[] = [];
  const joined = [...analysis.actions, ...analysis.rootCauses, analysis.report].join("\n");

  if (!analysis.evidence.length) triggered.push("ungrounded_report");
  if (analysis.confidence < 0 || analysis.confidence > 1) triggered.push("invalid_confidence");
  if (UNSAFE_REMEDIATION_PATTERNS.some((pattern) => pattern.test(joined))) {
    triggered.push("unsafe_remediation");
  }

  return {
    passed: triggered.length === 0,
    triggered,
    riskLevel: triggered.includes("unsafe_remediation") ? "high" : triggered.length ? "medium" : "low",
    message: triggered.length ? "Output guardrails found issues in the analysis." : "Output passed safety guardrails."
  };
}
