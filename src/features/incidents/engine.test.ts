import { describe, expect, it } from "vitest";
import { buildActions, extractEvidence, inferRootCauses, inferSeverity, runIncidentAgents } from "./engine";

const input = {
  title: "Checkout outage after release",
  source: "manual" as const,
  description:
    "Critical checkout outage after release. Payment failed with timeout errors. Database connection refused and latency degraded for customers."
};

describe("incident agent engine", () => {
  it("runs the full five-stage analysis pipeline", () => {
    const analysis = runIncidentAgents(input, new Date("2026-05-20T09:00:00.000Z"));

    expect(analysis.stages.map((stage) => stage.stage)).toEqual([
      "intake",
      "severity",
      "rootCause",
      "remediation",
      "report"
    ]);
    expect(analysis.severity).toBe("critical");
    expect(analysis.report).toContain("## Recommended Actions");
  });

  it("extracts evidence lines from noisy text", () => {
    expect(extractEvidence(input.description)).toEqual([
      "Critical checkout outage after release",
      "Payment failed with timeout errors",
      "Database connection refused and latency degraded for customers"
    ]);
  });

  it("infers root-cause hypotheses from incident language", () => {
    expect(inferRootCauses(input.description)).toEqual(
      expect.arrayContaining([
        "Recent deployment introduced a regression or changed service behavior.",
        "Database connectivity or connection pool saturation is limiting request throughput."
      ])
    );
  });

  it("raises severity when multiple high-impact signals appear", () => {
    expect(inferSeverity(input.description, 7)).toBe("critical");
    expect(inferSeverity("One timeout and a retry", 2)).toBe("medium");
  });

  it("adds targeted remediation actions for database and deploy incidents", () => {
    const actions = buildActions("high", [
      "Database connectivity or connection pool saturation is limiting request throughput.",
      "Recent deployment introduced a regression or changed service behavior."
    ]);

    expect(actions).toEqual(expect.arrayContaining([
      "Inspect database connection pool limits, slow queries, and saturation metrics.",
      "Review the latest deployment diff and rollback if mitigation is not clear within the response window."
    ]));
  });
});
