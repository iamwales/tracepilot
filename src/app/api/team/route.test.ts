import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("/api/team", () => {
  it("invites a team member in demo mode", async () => {
    const response = await POST(
      new Request("http://tracepilot.test/api/team", {
        method: "POST",
        body: JSON.stringify({ email: "new.member@example.com", role: "Member" })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.member.email).toBe("new.member@example.com");
    expect(payload.member.active).toBe(false);
  });

  it("rejects duplicate team invites", async () => {
    const body = JSON.stringify({ email: "duplicate@example.com", role: "Admin" });
    await POST(new Request("http://tracepilot.test/api/team", { method: "POST", body }));

    const response = await POST(new Request("http://tracepilot.test/api/team", { method: "POST", body }));
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toBe("That user is already a member of this team.");
  });
});
