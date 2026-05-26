import { auth, currentUser } from "@clerk/nextjs/server";

export type CurrentUserProfile = {
  id: string;
  fullName: string;
  email: string;
  imageUrl: string | null;
};

export async function getCurrentUserId() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return "demo-user";
  }

  const session = await auth();
  return session.userId;
}

export async function getCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return {
      id: "demo-user",
      fullName: "Demo User",
      email: "demo@tracepilot.io",
      imageUrl: null
    };
  }

  const user = await currentUser();
  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress || "";
  const fallbackName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return {
    id: user.id,
    fullName: user.fullName || fallbackName || user.username || email || "TracePilot User",
    email,
    imageUrl: user.imageUrl || null
  };
}
