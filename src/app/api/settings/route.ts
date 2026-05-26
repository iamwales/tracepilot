import { NextResponse } from "next/server";
import { profileUpdateSchema } from "@/features/dashboard/schemas";
import { getProfile, updateProfile } from "@/features/dashboard/store";
import { getCurrentUserProfile } from "@/lib/auth/user";

export async function GET() {
  const user = await getCurrentUserProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    profile: await getProfile(user.id, {
      fullName: user.fullName,
      email: user.email
    })
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUserProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid profile update." }, { status: 422 });
  }

  return NextResponse.json({
    profile: await updateProfile(user.id, {
      ...parsed.data,
      fullName: user.fullName,
      email: user.email
    })
  });
}
