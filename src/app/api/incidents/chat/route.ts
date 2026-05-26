import { NextResponse } from "next/server";
import { remediationChatRequestSchema, streamRemediationChatAgent } from "@/features/incidents/chat";
import { getCurrentUserId } from "@/lib/auth/user";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = remediationChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid chat request." }, { status: 422 });
  }

  const result = await streamRemediationChatAgent(parsed.data);
  return new Response(result.stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-TracePilot-Agent": "Remediation Chat Agent",
      "X-TracePilot-Provider": result.provider,
      "X-TracePilot-Model": result.model
    }
  });
}
