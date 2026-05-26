import type { SubscriptionSettings } from "./types";

export const planDetails: Record<
  SubscriptionSettings["plan"],
  {
    name: string;
    priceLabel: string;
    amountUsd: number | null;
    incidentLimit: number;
  }
> = {
  starter: {
    name: "Starter",
    priceLabel: "$0",
    amountUsd: 0,
    incidentLimit: 50
  },
  pro: {
    name: "Pro",
    priceLabel: "$20",
    amountUsd: 20,
    incidentLimit: 10000
  },
  enterprise: {
    name: "Enterprise",
    priceLabel: "Custom",
    amountUsd: null,
    incidentLimit: 50000
  }
};

export function getPlanIncidentLimit(plan: SubscriptionSettings["plan"]) {
  return planDetails[plan].incidentLimit;
}
