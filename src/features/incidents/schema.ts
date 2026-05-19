import { z } from "zod";

export const incidentInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(6, "Use a clearer title with at least 6 characters.")
    .max(90, "Keep the title under 90 characters."),
  source: z.enum(["manual", "cloudwatch", "datadog", "prometheus", "other"]),
  description: z
    .string()
    .trim()
    .min(40, "Paste at least 40 characters of logs or incident context.")
    .max(12000, "Keep the first version under 12,000 characters.")
});

export type IncidentInput = z.infer<typeof incidentInputSchema>;

export type IncidentDraft = IncidentInput & {
  fingerprint: string;
  signalCount: number;
  createdAt: string;
};

export function createIncidentDraft(input: IncidentInput, now = new Date()): IncidentDraft {
  const parsed = incidentInputSchema.parse(input);
  return {
    ...parsed,
    fingerprint: createFingerprint(parsed.title, parsed.description),
    signalCount: countSignals(parsed.description),
    createdAt: now.toISOString()
  };
}

export function countSignals(text: string): number {
  const signalPattern = /\b(error|failed|failure|timeout|latency|exception|critical|degraded|unavailable|refused|saturation)\b/gi;
  return text.match(signalPattern)?.length ?? 0;
}

function createFingerprint(title: string, description: string): string {
  const normalized = `${title}:${description}`.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }
  return `tp_${hash.toString(16).padStart(8, "0")}`;
}
