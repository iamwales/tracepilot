import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/incidents(.*)", "/api/(.*)"]);

const clerkHandler = clerkMiddleware(async (auth, req) => {
  await auth.protect();
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (!isProtectedRoute(req)) {
    return NextResponse.next();
  }

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    console.warn("[middleware] Clerk keys are missing; skipping auth middleware.");
    return req.nextUrl.pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Authentication is not configured." }, { status: 503 })
      : NextResponse.redirect(new URL("/", req.url));
  }

  try {
    return clerkHandler(req, event);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Clerk middleware error.";
    console.error(`[middleware] Clerk middleware failed: ${message}`);
    return req.nextUrl.pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Authentication middleware failed." }, { status: 503 })
      : NextResponse.redirect(new URL("/", req.url));
  }
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"]
};