import { NextResponse } from "next/server";
import { notificationUpdateSchema } from "@/features/dashboard/schemas";
import { getNotifications, updateNotifications } from "@/features/dashboard/store";
import { getCurrentUserId } from "@/lib/auth/user";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ notifications: await getNotifications(userId) });
}

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = notificationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid notification settings." }, { status: 422 });
  }

  return NextResponse.json({ notifications: await updateNotifications(userId, parsed.data) });
}
