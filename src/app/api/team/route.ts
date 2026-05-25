import { NextResponse } from "next/server";
import { teamInviteSchema } from "@/features/dashboard/schemas";
import { inviteTeamMember, listTeamMembers } from "@/features/dashboard/store";
import { getCurrentUserId } from "@/lib/auth/user";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ members: await listTeamMembers(userId) });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = teamInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid invite." }, { status: 422 });
  }

  return NextResponse.json({ member: await inviteTeamMember(userId, parsed.data.email, parsed.data.role) }, { status: 201 });
}
