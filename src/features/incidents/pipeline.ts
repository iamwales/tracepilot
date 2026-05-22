import { runIncidentAgents } from "./engine";
import { runInputGuardrails, runOutputGuardrails } from "./guardrails";
import { runOpenRouterIncidentAgents } from "./openRouterAnalysis";
import { traceGuardrail, traceIncidentRun, type TraceMetadata } from "./observability";
import type { IncidentInput } from "./schema";
import type { IncidentAnalysis, AnalysisProvider, GuardrailMetadata, TokenUsage } from "./types";
import type { Json } from "@/lib/supabase/types";

export class GuardrailBlockedError extends Error {
  constructor(public readonly guardrails: GuardrailMetadata) {
    super(guardrails.input.message);
  }
}

export async function runIncidentPipeline(input: IncidentInput, context: {
  incidentId: string;
  userId: string;
  now?: Date;
}): Promise<IncidentAnalysis> {
  const now = context.now ?? new Date();
  return traceIncidentRun(
    {
      incidentId: context.incidentId,
      userId: context.userId,
      title: input.title,
      source: input.source,
      input: { title: input.title, source: input.source } as Json
    },
    async (traceMetadata) => {
      const inputGuardrail = await traceGuardrail("input_safety", { title: input.title, source: input.source } as Json, async () =>
        runInputGuardrails(input)
      );

      if (!inputGuardrail.passed) {
        throw new GuardrailBlockedError({
          input: inputGuardrail,
          output: {
            passed: false,
            triggered: ["analysis_not_run"],
            riskLevel: "medium",
            message: "Output guardrails were not run because input guardrails blocked analysis."
          }
        });
      }

      const { analysis, provider, model, tokenUsage } = await runModelOrFallback(input, context.incidentId, now);
      const outputGuardrail = await traceGuardrail("output_safety", { incidentId: context.incidentId } as Json, async () =>
        runOutputGuardrails(analysis)
      );

      const finalAnalysis = outputGuardrail.passed
        ? analysis
        : {
            ...runIncidentAgents(input, now),
            provider: "deterministic" as const
          };

      return decorateAnalysis(finalAnalysis, {
        provider: outputGuardrail.passed ? provider : "deterministic",
        model: outputGuardrail.passed ? model : "deterministic-fallback",
        tokenUsage: outputGuardrail.passed ? tokenUsage : emptyUsage(),
        guardrails: {
          input: inputGuardrail,
          output: outputGuardrail
        },
        traceMetadata
      });
    }
  );
}

async function runModelOrFallback(input: IncidentInput, incidentId: string, now: Date): Promise<{
  analysis: IncidentAnalysis;
  provider: AnalysisProvider;
  model: string;
  tokenUsage: TokenUsage;
}> {
  if (!process.env.OPENROUTER_API_KEY) {
    return {
      analysis: runIncidentAgents(input, now),
      provider: "deterministic",
      model: "deterministic-fallback",
      tokenUsage: emptyUsage()
    };
  }

  try {
    const result = await runOpenRouterIncidentAgents(input, incidentId, now);
    return {
      analysis: result.analysis,
      provider: "openrouter",
      model: result.model,
      tokenUsage: result.tokenUsage
    };
  } catch {
    return {
      analysis: runIncidentAgents(input, now),
      provider: "deterministic",
      model: "deterministic-fallback-after-openrouter-error",
      tokenUsage: emptyUsage()
    };
  }
}

function decorateAnalysis(
  analysis: IncidentAnalysis,
  metadata: {
    provider: AnalysisProvider;
    model: string;
    tokenUsage: TokenUsage;
    guardrails: GuardrailMetadata;
    traceMetadata: TraceMetadata;
  }
): IncidentAnalysis {
  return {
    ...analysis,
    provider: metadata.provider,
    model: metadata.model,
    tokenUsage: metadata.tokenUsage,
    guardrails: metadata.guardrails,
    observability: {
      traceId: metadata.traceMetadata.traceId,
      openaiTracingEnabled: metadata.traceMetadata.openaiTracingEnabled,
      langfuseEnabled: metadata.traceMetadata.langfuseEnabled
    }
  };
}

function emptyUsage(): TokenUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: null
  };
}
