import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/user";
import { connectorUpdateSchema } from "@/features/dashboard/schemas";
import { listConnectors, updateConnector } from "@/features/dashboard/store";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ connectors: await listConnectors(userId) });
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
  return NextResponse.json({ connector: await updateConnector(userId, id, patch) });
}
