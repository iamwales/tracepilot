import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/incidents(.*)", "/api/(.*)"]);

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!publishableKey || !secretKey) {
    console.error("[middleware] Clerk env vars are missing in this Vercel environment.");
    return req.nextUrl.pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Authentication is not configured." }, { status: 503 })
      : NextResponse.redirect(new URL("/", req.url));
  }

  try {
    const protectedMiddleware = clerkMiddleware(
      async (auth, protectedReq) => {
        if (isProtectedRoute(protectedReq)) {
          await auth.protect();
        }
      },
      {
        publishableKey,
        secretKey
      }
    );

    return await protectedMiddleware(req, event);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Clerk middleware error.";
    console.error(`[middleware] Clerk middleware failed for ${req.nextUrl.pathname}: ${message}`);

    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication middleware failed." }, { status: 503 });
    }

    return NextResponse.redirect(new URL("/", req.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/incidents/:path*", "/api/:path*"]
};
