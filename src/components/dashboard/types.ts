import type { Severity } from "@/features/incidents/types";

export type DashboardIncidentStatus = "open" | "investigating" | "mitigated" | "resolved";

export type DashboardIncident = {
  id: string;
  title: string;
  severity: Severity;
  timeAgo: string;
  confidence: number;
  service: string;
  status: DashboardIncidentStatus;
  summary: string;
  evidence: string[];
  rootCauses: string[];
  actions: string[];
};

export type ConnectorCategory =
  | "Cloud"
  | "Comms"
  | "Log Platform"
  | "Observability"
  | "Ticketing"
  | "VCS"
  | "Alerting";

export type Connector = {
  id: string;
  name: string;
  category: ConnectorCategory;
  description: string;
  connected: boolean;
};

export type TeamMember = {
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Member";
  initials: string;
  active: boolean;
};
