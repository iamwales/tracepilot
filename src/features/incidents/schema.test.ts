import { describe, expect, it } from "vitest";
import { createIncidentDraft, countSignals, incidentInputSchema } from "./schema";

describe("incident input schema", () => {
  it("accepts a valid incident", () => {
    const result = incidentInputSchema.safeParse({
      title: "Checkout timeout after deploy",
      source: "manual",
      description:
        "The checkout API started returning timeout errors after the latest deploy. Logs show failed payment calls and elevated latency."
    });

    expect(result.success).toBe(true);
  });

  it("rejects thin incident context", () => {
    const result = incidentInputSchema.safeParse({
      title: "Bad",
      source: "manual",
      description: "timeout"
    });

    expect(result.success).toBe(false);
  });
});

describe("incident draft", () => {
  it("creates a stable fingerprint and counts operational signals", () => {
    const draft = createIncidentDraft(
      {
        title: "Checkout timeout after deploy",
        source: "manual",
        description:
          "Checkout failed with timeout errors. Database connection refused and latency degraded for payment requests."
      },
      new Date("2026-05-19T08:00:00.000Z")
    );

    expect(draft.fingerprint).toMatch(/^tp_[a-f0-9]{8}$/);
    expect(draft.signalCount).toBeGreaterThanOrEqual(4);
    expect(draft.createdAt).toBe("2026-05-19T08:00:00.000Z");
  });

  it("counts known incident signal words case-insensitively", () => {
    expect(countSignals("ERROR Timeout timeout unavailable healthy")).toBe(4);
  });
});
