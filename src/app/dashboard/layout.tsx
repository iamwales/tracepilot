import type { ReactNode } from "react";
import { DashboardProvider } from "@/components/dashboard/DashboardContext";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { ChatSlider } from "@/components/dashboard/ChatSlider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardProvider>
      <div className="relative flex h-screen overflow-hidden bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.05)_1px,transparent_1px)] bg-[size:44px_44px] dark:bg-[linear-gradient(rgba(239,68,68,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.035)_1px,transparent_1px)]"
        />
        <Sidebar />
        <div className="relative z-[1] flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
        <ChatSlider />
      </div>
    </DashboardProvider>
  );
}
