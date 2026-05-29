import { NextResponse } from "next/server";
import { remediationChatRequestSchema, streamRemediationChatAgent } from "@/features/incidents/chat";
import { appendIncidentChatMessage, listIncidentChatMessages } from "@/features/incidents/store";
import { getCurrentUserId } from "@/lib/auth/user";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const incidentId = url.searchParams.get("incidentId");
  if (!incidentId) return NextResponse.json({ error: "Missing incidentId." }, { status: 422 });

  const messages = await listIncidentChatMessages(userId, incidentId);
  return NextResponse.json({
    messages: messages.map((message) => ({
      id: message.id,
      role: message.role,
      text: message.content,
      createdAt: message.createdAt
    }))
  });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = remediationChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid chat request." }, { status: 422 });
  }

  const incidentId = parsed.data.incident.recordId || parsed.data.incident.id;
  const result = await streamRemediationChatAgent(parsed.data);

  return new Response(
    persistChatStream(result.stream, {
      userId,
      incidentId,
      question: parsed.data.question,
      provider: result.provider,
      model: result.model
    }),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-TracePilot-Agent": "Remediation Chat Agent",
        "X-TracePilot-Provider": result.provider,
        "X-TracePilot-Model": result.model
      }
    }
  );
}

function persistChatStream(
  stream: ReadableStream<Uint8Array>,
  details: { userId: string; incidentId: string; question: string; provider: string; model: string }
) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let answer = "";

  return stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        answer += decoder.decode(chunk, { stream: true });
        controller.enqueue(chunk);
      },
      async flush(controller) {
        const remaining = decoder.decode();
        if (remaining) {
          answer += remaining;
          controller.enqueue(encoder.encode(remaining));
        }

        const content = answer.trim();
        if (!content) return;

        try {
          await appendIncidentChatMessage({
            userId: details.userId,
            incidentId: details.incidentId,
            role: "user",
            content: details.question
          });
          await appendIncidentChatMessage({
            userId: details.userId,
            incidentId: details.incidentId,
            role: "assistant",
            content,
            provider: details.provider,
            model: details.model
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown chat persistence error.";
          console.error(`[incident-chat] Failed to persist assistant message: ${message}`);
        }
      }
    })
  );
}
