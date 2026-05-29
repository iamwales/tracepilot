import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";

const incident = {
  id: "#chat-test",
  recordId: "chat-test-incident",
  title: "db-primary ECONNREFUSED cascade",
  severity: "critical" as const,
  confidence: 95,
  service: "auth-service",
  summary: "Auth service cannot connect to db-primary and health checks are failing.",
  evidence: ["2024-01-15T10:42:09.115Z ERROR ECONNREFUSED connect to db-primary:5432"],
  rootCauses: ["Primary database process or route is unavailable."],
  actions: ["Verify network route to db-primary:5432"]
};

describe("/api/incidents/chat", () => {
  it("persists user and assistant messages for an incident", async () => {
    const response = await POST(
      new Request("http://tracepilot.test/api/incidents/chat", {
        method: "POST",
        body: JSON.stringify({
          question: "Which log line triggered this?",
          incident,
          history: []
        })
      })
    );

    expect(response.status).toBe(200);
    const answer = await readTextStream(response.body);
    expect(answer).toContain("ECONNREFUSED");

    const historyResponse = await GET(new Request("http://tracepilot.test/api/incidents/chat?incidentId=chat-test-incident"));
    const history = await historyResponse.json();

    expect(historyResponse.status).toBe(200);
    expect(history.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "user", text: "Which log line triggered this?" }),
        expect.objectContaining({ role: "assistant", text: expect.stringContaining("ECONNREFUSED") })
      ])
    );
  });
});

async function readTextStream(stream: ReadableStream<Uint8Array> | null) {
  if (!stream) return "";
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
