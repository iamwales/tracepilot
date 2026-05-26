import { NextResponse } from "next/server";
import { subscriptionUpdateSchema } from "@/features/dashboard/schemas";
import { getSubscription, updateSubscriptionPlan } from "@/features/dashboard/store";
import { getCurrentUserId } from "@/lib/auth/user";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ subscription: await getSubscription(userId) });
}

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = subscriptionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid subscription update." }, { status: 422 });
  }

  return NextResponse.json({ subscription: await updateSubscriptionPlan(userId, parsed.data.plan) });
}
