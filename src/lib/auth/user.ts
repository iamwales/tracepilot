import { auth } from "@clerk/nextjs/server";

export async function getCurrentUserId() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return "demo-user";
  }

  const session = await auth();
  return session.userId;
}
