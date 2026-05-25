import { describe, expect, it } from "vitest";
import { runRemediationChatAgent, streamRemediationChatAgent } from "./chat";

const incident = {
  id: "#incident",
  title: "db-primary ECONNREFUSED cascade",
  severity: "critical" as const,
  confidence: 95,
  service: "auth-service",
  summary: "Auth service cannot connect to db-primary and health checks are failing.",
  evidence: [
    "2024-01-15T10:42:09.115Z ERROR ECONNREFUSED connect to db-primary:5432",
    "2024-01-15T10:42:10.770Z ERROR Max retries exceeded connection pool exhausted"
  ],
  rootCauses: ["Primary database process or route is unavailable."],
  actions: ["Verify network route to db-primary:5432"]
};

describe("runRemediationChatAgent", () => {
  it("answers from incident evidence when OpenRouter is not configured", async () => {
    const originalKey = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;

    const result = await runRemediationChatAgent({
      question: "Which log line triggered this?",
      incident,
      history: []
    });

    if (originalKey === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = originalKey;
    }

    expect(result.provider).toBe("deterministic");
    expect(result.answer).toContain("ECONNREFUSED");
  });

  it("streams deterministic answers when OpenRouter is not configured", async () => {
    const originalKey = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;

    const result = await streamRemediationChatAgent({
      question: "What command should I run first?",
      incident,
      history: []
    });
    const answer = await readTextStream(result.stream);

    if (originalKey === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = originalKey;
    }

    expect(result.provider).toBe("deterministic");
    expect(answer).toContain("Verify network route");
  });
});

async function readTextStream(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}
