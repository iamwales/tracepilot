import { NextResponse } from "next/server";
import { teamInviteSchema } from "@/features/dashboard/schemas";
import { inviteTeamMember, listTeamMembers } from "@/features/dashboard/store";
import { getCurrentUserId } from "@/lib/auth/user";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    return NextResponse.json({ members: await listTeamMembers(userId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load team members." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = teamInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid invite." }, { status: 422 });
  }

  try {
    return NextResponse.json({ member: await inviteTeamMember(userId, parsed.data.email, parsed.data.role) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not invite member." }, { status: teamInviteErrorStatus(error) });
  }
}

function teamInviteErrorStatus(error: unknown) {
  if (!(error instanceof Error)) return 500;
  const status = getErrorStatus(error);
  if (status && status >= 400 && status < 500) return status;
  if (error.message.includes("already a member")) return 409;
  if (error.message.includes("Only owners and admins")) return 403;
  if (error.message.includes("Invalid") || error.message.includes("not allowed")) return 400;
  return 500;
}

function getErrorStatus(error: Error) {
  const value = (error as Error & { status?: unknown; statusCode?: unknown }).status ?? (error as Error & { statusCode?: unknown }).statusCode;
  return typeof value === "number" ? value : null;
}
