import { describe, expect, it } from "vitest";
import { AGENT_STAGES, buildPreviewAssessment } from "./agents";
import { createIncidentDraft } from "./schema";

describe("agent stages", () => {
  it("keeps the day-one pipeline in the expected order", () => {
    expect(AGENT_STAGES.map((stage) => stage.id)).toEqual([
      "intake",
      "severity",
      "rootCause",
      "remediation",
      "report"
    ]);
  });

  it("builds a high severity preview when there are many signals", () => {
    const draft = createIncidentDraft({
      title: "Checkout outage with database failures",
      source: "manual",
      description:
        "Critical checkout error. Payment failed, timeout, unavailable database, connection refused, degraded latency, exception."
    });

    expect(buildPreviewAssessment(draft)).toMatchObject({
      status: "ready",
      severityHint: "high"
    });
  });
});
