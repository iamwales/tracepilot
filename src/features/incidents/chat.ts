import OpenAI from "openai";
import { z } from "zod";
import type { Severity } from "./types";

const severitySchema = z.enum(["low", "medium", "high", "critical"]);

const incidentChatContextSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(160),
  severity: severitySchema,
  confidence: z.number().min(0).max(100),
  service: z.string().min(1).max(120),
  summary: z.string().min(1).max(3000),
  evidence: z.array(z.string().min(1).max(1000)).max(8).default([]),
  rootCauses: z.array(z.string().min(1).max(1000)).max(6).default([]),
  actions: z.array(z.string().min(1).max(1000)).max(8).default([])
});

const chatMessageSchema = z.object({
  role: z.enum(["assistant", "user"]),
  text: z.string().min(1).max(2000)
});

export const remediationChatRequestSchema = z.object({
  question: z.string().trim().min(2, "Ask a clearer remediation question.").max(1000),
  incident: incidentChatContextSchema,
  history: z.array(chatMessageSchema).max(8).default([])
});

export type RemediationChatRequest = z.infer<typeof remediationChatRequestSchema>;

export type RemediationChatResponse = {
  answer: string;
  provider: "openrouter" | "deterministic";
  model: string;
};

type RemediationChatStream = {
  stream: ReadableStream<Uint8Array>;
  provider: "openrouter" | "deterministic";
  model: string;
};

export async function runRemediationChatAgent(request: RemediationChatRequest): Promise<RemediationChatResponse> {
  if (!process.env.OPENROUTER_API_KEY) {
    return {
      answer: buildDeterministicAnswer(request),
      provider: "deterministic",
      model: "tracepilot-remediation-rules"
    };
  }

  const model = process.env.OPENROUTER_CHAT_MODEL || process.env.OPENROUTER_MODEL || process.env.AI_MODEL_NAME || "openai/gpt-4.1-mini";
  const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    defaultHeaders: openRouterHeaders()
  });

  const response = await client.chat.completions.create({
    model,
    temperature: 0.2,
    max_tokens: 700,
    messages: [
      {
        role: "system",
        content:
          "You are TracePilot's Remediation Chat Agent. Answer only from the provided incident context and operational best practices. Do not invent telemetry, secrets, credentials, or destructive commands. Prefer reversible checks and approval-aware remediation. If the context is insufficient, say what is missing."
      },
      {
        role: "user",
        content: buildPrompt(request)
      }
    ]
  });

  return {
    answer: response.choices[0]?.message.content?.trim() || buildDeterministicAnswer(request),
    provider: "openrouter",
    model
  };
}

export async function streamRemediationChatAgent(request: RemediationChatRequest): Promise<RemediationChatStream> {
  if (!process.env.OPENROUTER_API_KEY) {
    return {
      stream: streamText(buildDeterministicAnswer(request)),
      provider: "deterministic",
      model: "tracepilot-remediation-rules"
    };
  }

  const model = process.env.OPENROUTER_CHAT_MODEL || process.env.OPENROUTER_MODEL || process.env.AI_MODEL_NAME || "openai/gpt-4.1-mini";
  const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    defaultHeaders: openRouterHeaders()
  });

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    max_tokens: 700,
    stream: true,
    messages: [
      {
        role: "system",
        content:
          "You are TracePilot's Remediation Chat Agent. Answer only from the provided incident context and operational best practices. Do not invent telemetry, secrets, credentials, or destructive commands. Prefer reversible checks and approval-aware remediation. If the context is insufficient, say what is missing."
      },
      {
        role: "user",
        content: buildPrompt(request)
      }
    ]
  });

  return {
    stream: streamOpenRouterCompletion(completion),
    provider: "openrouter",
    model
  };
}

function buildPrompt(request: RemediationChatRequest) {
  const { incident } = request;
  const history = request.history.map((message) => `${message.role.toUpperCase()}: ${message.text}`).join("\n");

  return [
    "Incident:",
    `ID: ${incident.id}`,
    `Title: ${incident.title}`,
    `Service/source: ${incident.service}`,
    `Severity: ${incident.severity}`,
    `Confidence: ${incident.confidence}%`,
    "",
    "Summary:",
    incident.summary,
    "",
    "Evidence:",
    listOrNone(incident.evidence),
    "",
    "Root causes:",
    listOrNone(incident.rootCauses),
    "",
    "Recommended actions:",
    listOrNone(incident.actions),
    "",
    "Recent chat:",
    history || "None",
    "",
    `Question: ${request.question}`
  ].join("\n");
}

function buildDeterministicAnswer(request: RemediationChatRequest) {
  const question = request.question.toLowerCase();
  const { incident } = request;
  const topEvidence = incident.evidence[0] || "No explicit evidence line was captured.";
  const rootCause = incident.rootCauses[0] || incident.summary;
  const firstAction = incident.actions[0] || "Start with a read-only health and reachability check for the affected dependency.";

  if (question.includes("trigger") || question.includes("log line") || question.includes("evidence")) {
    return [
      `The strongest trigger is: ${topEvidence}`,
      incident.evidence.length > 1 ? `The supporting sequence is ${incident.evidence.slice(1, 4).join(" -> ")}.` : "There is not enough supporting evidence in this incident yet."
    ].join("\n");
  }

  if (question.includes("command") || question.includes("run first") || question.includes("first")) {
    return [
      `Start with the safest verification step: ${firstAction}`,
      commandHint(incident.severity, incident.service),
      "Avoid failover or restarts until reachability, process health, and recent deployment/change context are checked."
    ].join("\n");
  }

  if (question.includes("verify") || question.includes("resolution") || question.includes("fixed")) {
    return [
      "Verify resolution with three signals:",
      "- The failing evidence line stops recurring.",
      "- Health checks recover for at least one rolling minute.",
      "- The circuit breaker or retry path returns to a closed/normal state."
    ].join("\n");
  }

  if (question.includes("risk") || question.includes("wait") || question.includes("impact")) {
    return `Waiting carries ${riskLabel(incident.severity)} risk. The likely failure mode is continued impact from: ${rootCause}`;
  }

  return [
    `For ${incident.id}, I would treat the working root cause as: ${rootCause}`,
    `Next step: ${firstAction}`,
    `Confidence is ${incident.confidence}%, so keep the action reversible unless new telemetry confirms a narrower fix.`
  ].join("\n");
}

function commandHint(severity: Severity, service: string) {
  if (service.toLowerCase().includes("auth")) {
    return "Concrete checks: confirm the auth service can reach the dependency, then inspect service health and connection pool metrics.";
  }

  if (severity === "critical" || severity === "high") {
    return "Concrete checks: run dependency reachability, service health, and recent deploy/change checks before choosing rollback or failover.";
  }

  return "Concrete checks: inspect the affected service health, recent changes, and the specific metric or log pattern that triggered the incident.";
}

function riskLabel(severity: Severity) {
  if (severity === "critical") return "critical";
  if (severity === "high") return "high";
  if (severity === "medium") return "moderate";
  return "low";
}

function listOrNone(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "None";
}

function openRouterHeaders() {
  const headers: Record<string, string> = {};
  if (process.env.OPENROUTER_SITE_URL) headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
  if (process.env.OPENROUTER_APP_NAME) headers["X-Title"] = process.env.OPENROUTER_APP_NAME;
  return headers;
}

function streamText(text: string) {
  const encoder = new TextEncoder();
  const chunks = chunkText(text);

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise((resolve) => setTimeout(resolve, 12));
      }
      controller.close();
    }
  });
}

function streamOpenRouterCompletion(completion: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of completion) {
          const text = event.choices[0]?.delta?.content;
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });
}

function chunkText(text: string) {
  const parts = text.match(/.{1,28}(\s|$)/g);
  return parts?.length ? parts : [text];
}
