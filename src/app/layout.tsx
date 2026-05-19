import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "TracePilot",
  description: "Multi-agent incident intelligence for modern operations teams."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const shell = (
    <html lang="en">
      <body>{children}</body>
    </html>
  );

  if (!publishableKey) {
    return shell;
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      {shell}
    </ClerkProvider>
  );
}
