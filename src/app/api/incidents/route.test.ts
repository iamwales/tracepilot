import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";

describe("/api/incidents", () => {
  it("creates and lists analyzed incidents in demo mode", async () => {
    const createResponse = await POST(
      new Request("http://tracepilot.test/api/incidents", {
        method: "POST",
        body: JSON.stringify({
          title: "Checkout outage after release",
          source: "manual",
          description:
            "Critical checkout outage after release. Payment failed with timeout errors. Database connection refused and latency degraded for customers."
        })
      })
    );

    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    expect(created.incident.analysis.stages).toHaveLength(5);

    const listResponse = await GET(new Request("http://tracepilot.test/api/incidents"));
    const listed = await listResponse.json();
    expect(listed.incidents.some((incident: { id: string }) => incident.id === created.incident.id)).toBe(true);
  });

  it("rejects invalid incident input", async () => {
    const response = await POST(
      new Request("http://tracepilot.test/api/incidents", {
        method: "POST",
        body: JSON.stringify({ title: "Bad", source: "manual", description: "short" })
      })
    );

    expect(response.status).toBe(422);
  });
});
