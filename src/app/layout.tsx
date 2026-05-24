import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { DM_Sans, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-body" });
const shareTechMono = Share_Tech_Mono({ weight: "400", subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "TracePilot",
  description: "Multi-agent incident intelligence for modern operations teams."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const shell = (
    <html lang="en" className={`${dmSans.variable} ${shareTechMono.variable}`}>
      <body>{children}</body>
    </html>
  );

  if (!publishableKey) {
    return shell;
  }

  return (
    <ClerkProvider 
      publishableKey={publishableKey}
      localization={{
        signIn: {
          start: {
            title: 'Sign in to TracePilot',
            subtitle: 'to continue to TracePilot',
          }
        },
        signUp: {
          start: {
            title: 'Create an account',
            subtitle: 'to continue to TracePilot',
          }
        }
      }}
      appearance={{
        variables: {
          colorPrimary: '#e8000d',
          colorBackground: '#ffffff',
          colorInputBackground: '#ffffff',
          colorInputText: '#0a0a0a',
          colorText: '#0a0a0a',
          colorTextSecondary: '#555555',
          fontFamily: 'var(--font-body), sans-serif',
          borderRadius: '0px',
        },
        elements: {
          card: 'border border-[#e8000d] shadow-[0_0_50px_rgba(232,0,13,0.15)] bg-white rounded-none',
          headerTitle: 'font-mono text-2xl tracking-widest uppercase text-black',
          headerSubtitle: 'text-gray-500 font-mono text-xs uppercase tracking-widest',
          socialButtonsBlockButton: 'border border-gray-200 hover:border-[#e8000d] bg-white transition-all rounded-none',
          socialButtonsBlockButtonText: 'font-mono text-xs uppercase tracking-widest text-black',
          dividerText: 'font-mono text-xs uppercase tracking-widest text-gray-500',
          formFieldLabel: 'font-mono text-xs uppercase tracking-widest text-gray-600',
          formFieldInput: 'bg-white border border-gray-300 focus:border-[#e8000d] focus:ring-1 focus:ring-[#e8000d] transition-colors text-black font-mono rounded-none',
          formButtonPrimary: 'bg-[#e8000d] hover:bg-[#ff1a24] text-white uppercase tracking-widest text-xs border-none shadow-[0_0_20px_rgba(232,0,13,0.4)] hover:shadow-[0_0_30px_rgba(232,0,13,0.6)] transition-all py-3 rounded-none',
          footerActionText: 'font-mono text-xs uppercase tracking-widest text-gray-500',
          footerActionLink: 'font-mono text-xs uppercase tracking-widest text-[#e8000d] hover:text-[#ff1a24]',
          identityPreviewText: 'font-mono text-xs text-black',
          identityPreviewEditButton: 'text-[#e8000d] hover:text-[#ff1a24]',
          formFieldSuccessText: 'font-mono text-xs text-[#1db954]',
          formFieldErrorText: 'font-mono text-xs text-[#e8000d]',
        }
      }}
    >
      {shell}
    </ClerkProvider>
  );
}
