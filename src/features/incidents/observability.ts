import { setTracingDisabled, withAgentSpan, withGenerationSpan, withGuardrailSpan, withTrace } from "@openai/agents";
import { setDefaultOpenAITracingExporter, setTracingExportApiKey } from "@openai/agents";
import { Langfuse } from "langfuse";
import type { Json } from "@/lib/db/types";

let tracingConfigured = false;
let langfuseClient: Langfuse | null | undefined;

export type TraceMetadata = {
  traceId: string;
  enabled: boolean;
  openaiTracingEnabled: boolean;
  langfuseEnabled: boolean;
};

export function configureTracing() {
  if (tracingConfigured) return;
  tracingConfigured = true;

  if (process.env.OPENAI_API_KEY) {
    setTracingExportApiKey(process.env.OPENAI_API_KEY);
    setDefaultOpenAITracingExporter();
    setTracingDisabled(false);
  } else {
    setTracingDisabled(true);
  }
}

export function getLangfuseClient() {
  if (langfuseClient !== undefined) return langfuseClient;

  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) {
    langfuseClient = null;
    return langfuseClient;
  }

  langfuseClient = new Langfuse({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA
  });
  return langfuseClient;
}

export async function flushObservability() {
  const langfuse = getLangfuseClient();
  if (langfuse) await langfuse.flushAsync();
}

export async function traceIncidentRun<T>(context: {
  incidentId: string;
  userId: string;
  title: string;
  source: string;
  input: Json;
}, fn: (metadata: TraceMetadata) => Promise<T>) {
  configureTracing();
  const traceId = `trace_${context.incidentId.replace(/[^a-zA-Z0-9_]/g, "_")}`;
  const langfuse = getLangfuseClient();
  const langfuseTrace = langfuse?.trace({
    id: traceId,
    name: "tracepilot.incident_analysis",
    userId: context.userId,
    sessionId: context.incidentId,
    input: context.input,
    metadata: {
      source: context.source,
      title: context.title
    },
    tags: ["tracepilot", "incident-analysis"]
  });

  return withTrace(
    "tracepilot.incident_analysis",
    async () => {
      const result = await fn({
        traceId,
        enabled: Boolean(process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || langfuse),
        openaiTracingEnabled: Boolean(process.env.OPENAI_API_KEY),
        langfuseEnabled: Boolean(langfuse)
      });
      langfuseTrace?.update({ output: result as Json });
      await flushObservability();
      return result;
    },
    {
      traceId,
      groupId: context.incidentId,
      metadata: {
        userId: context.userId,
        source: context.source,
        title: context.title
      }
    }
  );
}

export async function traceGuardrail<T>(name: string, input: Json, fn: () => Promise<T>) {
  return withGuardrailSpan(fn, {
    data: {
      name,
      triggered: false
    },
    traceMetadata: {
      input
    }
  });
}

export async function traceAgentStage<T>(name: string, fn: () => Promise<T>) {
  return withAgentSpan(fn, {
    data: {
      name
    }
  });
}

export async function traceGeneration<T>(model: string, input: Json, fn: () => Promise<T>) {
  return withGenerationSpan(fn, {
    data: {
      model,
      input: [{ input }]
    }
  });
}
