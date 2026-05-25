import type { Connector, ConnectorCategory, TeamMember } from "@/components/dashboard/types";

export type ConnectorRecord = Connector & {
  userId: string;
  tokenConfigured: boolean;
  webhookUrl: string | null;
  updatedAt: string;
};

export type ProfileSettings = {
  userId: string;
  fullName: string;
  email: string;
  company: string;
  role: string;
  updatedAt: string;
};

export type NotificationSettings = {
  userId: string;
  critical: boolean;
  high: boolean;
  digest: boolean;
  remediation: boolean;
  connectors: boolean;
  updatedAt: string;
};

export type SubscriptionSettings = {
  userId: string;
  plan: "starter" | "pro" | "enterprise";
  status: "active" | "trialing" | "past_due" | "canceled";
  renewsAt: string | null;
  usage: {
    analyses: number;
    apiCalls: number;
  };
  updatedAt: string;
};

export type TeamMemberRecord = TeamMember & {
  userId: string;
  id: string;
  invitedAt: string;
};

export type ConnectorPatch = {
  connected?: boolean;
  token?: string;
  webhookUrl?: string | null;
};

export type ConnectorSeed = {
  id: string;
  name: string;
  category: ConnectorCategory;
  description: string;
  connected: boolean;
};
