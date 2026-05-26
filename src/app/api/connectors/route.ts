import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/user";
import { connectorUpdateSchema } from "@/features/dashboard/schemas";
import { listConnectors, updateConnector } from "@/features/dashboard/store";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    return NextResponse.json({ connectors: await listConnectors(userId) });
  } catch {
    return NextResponse.json({ error: "Could not load connectors." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = connectorUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid connector update." }, { status: 422 });
  }

  const { id, ...patch } = parsed.data;
  try {
    return NextResponse.json({ connector: await updateConnector(userId, id, patch) });
  } catch (error) {
    if (error instanceof Error && error.message === "Connector not found.") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: "Could not update connector." }, { status: 500 });
  }
}
