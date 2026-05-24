"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { DashboardIncident } from "./types";

type DashboardContextValue = {
  chatOpen: boolean;
  chatIncident: DashboardIncident | null;
  openChat: (incident: DashboardIncident) => void;
  closeChat: () => void;
};

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [chatIncident, setChatIncident] = useState<DashboardIncident | null>(null);

  const value = useMemo<DashboardContextValue>(
    () => ({
      chatOpen: chatIncident !== null,
      chatIncident,
      openChat: setChatIncident,
      closeChat: () => setChatIncident(null)
    }),
    [chatIncident]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error("useDashboard must be used within DashboardProvider");
  }

  return context;
}
