import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/user";
import { listIncidents } from "@/features/incidents/store";
import { getNotifications, getProfile, getSubscription, listConnectors, listTeamMembers } from "@/features/dashboard/store";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [incidents, connectors, profile, notifications, subscription, members] = await Promise.all([
    listIncidents(userId),
    listConnectors(userId),
    getProfile(userId),
    getNotifications(userId),
    getSubscription(userId),
    listTeamMembers(userId)
  ]);

  return NextResponse.json({
    incidents,
    connectors,
    profile,
    notifications,
    subscription,
    members
  });
}
