import { describe, expect, it } from "vitest";
import { GET, PATCH } from "./route";

describe("/api/connectors", () => {
  it("returns seeded connectors in demo mode", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.connectors.length).toBeGreaterThan(0);
  });

  it("returns 404 for unknown connector updates", async () => {
    const response = await PATCH(
      new Request("http://tracepilot.test/api/connectors", {
        method: "PATCH",
        body: JSON.stringify({ id: "missing", connected: true })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe("Connector not found.");
  });
});
