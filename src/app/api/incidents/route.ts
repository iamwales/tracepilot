import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/user";
import { GuardrailBlockedError, runIncidentPipeline } from "@/features/incidents/pipeline";
import { incidentInputSchema } from "@/features/incidents/schema";
import { getSubscription } from "@/features/dashboard/store";
import { getPlanIncidentLimit } from "@/features/dashboard/plans";
import { getIncident, listIncidents, saveIncident } from "@/features/incidents/store";
import type { IncidentRecord } from "@/features/incidents/types";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (id) {
    const incident = await getIncident(userId, id);
    if (!incident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    return NextResponse.json({ incident });
  }

  return NextResponse.json({ incidents: await listIncidents(userId) });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = incidentInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid incident input." }, { status: 422 });
  }

  const now = new Date();
  const subscription = await getSubscription(userId);
  const incidentLimit = getPlanIncidentLimit(subscription.plan);
  if (subscription.usage.analyses >= incidentLimit) {
    return NextResponse.json(
      {
        error: `Monthly incident limit reached for the ${subscription.planName || subscription.plan} plan.`,
        plan: subscription.plan,
        usage: subscription.usage.analyses,
        limit: incidentLimit
      },
      { status: 402 }
    );
  }

  const id = crypto.randomUUID();
  let analysis;
  try {
    analysis = await runIncidentPipeline(parsed.data, { incidentId: id, userId, now });
  } catch (error) {
    if (error instanceof GuardrailBlockedError) {
      return NextResponse.json(
        {
          error: error.message,
          guardrails: error.guardrails
        },
        { status: 422 }
      );
    }
    throw error;
  }

  const incident: IncidentRecord = {
    id,
    userId,
    title: parsed.data.title,
    source: parsed.data.source,
    description: parsed.data.description,
    status: "completed",
    severity: analysis.severity,
    analysis: {
      ...analysis,
      stages: analysis.stages.map((stage) => ({
        ...stage,
        id: stage.id.startsWith("tp_") ? crypto.randomUUID() : stage.id,
        incidentId: id
      }))
    },
    createdAt: now.toISOString()
  };

  return NextResponse.json({ incident: await saveIncident(incident) }, { status: 201 });
}
