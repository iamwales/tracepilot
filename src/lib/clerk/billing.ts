import type { SubscriptionSettings } from "@/features/dashboard/types";

type ClerkBillingSnapshot = Partial<SubscriptionSettings> & {
  provider: "clerk";
};

const CLERK_API_BASE_URL = "https://api.clerk.com/v1";

export async function getClerkUserBillingSnapshot(userId: string): Promise<ClerkBillingSnapshot | null> {
  const apiKey = process.env.SUBSCRIPTION_PLAN_API_KEY || process.env.CLERK_SECRET_KEY;
  if (!apiKey || userId === "demo-user") return null;

  try {
    const [subscription, plans] = await Promise.all([
      clerkGet<Record<string, unknown>>(`/users/${userId}/billing/subscription`, apiKey),
      clerkGet<{ data?: Array<Record<string, unknown>> }>("/commerce/plans?payer_type=user&limit=100", apiKey)
    ]);

    const item = getPrimarySubscriptionItem(subscription);
    const plan = item?.plan || subscription.plan || findPlan(plans.data ?? [], item?.plan_id || subscription.plan_id);
    const planName = getString(plan, ["name", "title"]) || getString(subscription, ["plan_name"]) || "Pro";
    const planSlug = getString(plan, ["slug", "key"]) || getString(subscription, ["plan", "plan_slug"]) || undefined;
    const planKey = normalizePlan(planName, planSlug);
    const subscriptionStatus = getString(subscription, ["status"]) || getString(item, ["status"]) || undefined;
    const status = normalizeStatus(subscriptionStatus);
    const amountUsd = getAmountUsd(item?.price || item || plan);

    return {
      provider: "clerk",
      providerSubscriptionId: getString(subscription, ["id"]) || null,
      plan: planKey,
      planName,
      amountUsd,
      status,
      renewsAt: getDateString(subscription, ["current_period_end", "next_payment.date", "renewal_date", "renews_at"])
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Clerk Billing error.";
    console.warn(`[clerk-billing] Falling back to local subscription: ${message}`);
    return null;
  }
}

async function clerkGet<T>(path: string, apiKey: string): Promise<T> {
  const response = await fetch(`${CLERK_API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Clerk Billing ${response.status}: ${body.slice(0, 240)}`);
  }

  return response.json() as Promise<T>;
}

function getPrimarySubscriptionItem(subscription: Record<string, unknown>) {
  const items = subscription.items;
  if (Array.isArray(items) && items.length) return items[0] as Record<string, any>;

  const subscriptionItems = subscription.subscription_items;
  if (Array.isArray(subscriptionItems) && subscriptionItems.length) return subscriptionItems[0] as Record<string, any>;

  return null;
}

function findPlan(plans: Array<Record<string, unknown>>, id: unknown) {
  if (!id) return null;
  return plans.find((plan) => plan.id === id) || null;
}

function normalizePlan(name: string, slug?: string): SubscriptionSettings["plan"] {
  const value = `${slug || ""} ${name}`.toLowerCase();
  if (value.includes("enterprise")) return "enterprise";
  if (value.includes("starter")) return "starter";
  return "pro";
}

function normalizeStatus(status?: string): SubscriptionSettings["status"] {
  if (status === "trialing" || status === "past_due" || status === "canceled") return status;
  return "active";
}

function getAmountUsd(source: unknown) {
  if (!source || typeof source !== "object") return null;
  const record = source as Record<string, unknown>;
  const amount = getNumber(record, ["amount", "unit_amount", "amount_cents", "monthly_amount"]);
  if (amount === null) return null;
  return amount > 999 ? amount / 100 : amount;
}

function getString(source: unknown, keys: string[]) {
  if (!source || typeof source !== "object") return null;
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = readPath(record, key);
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function getNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = readPath(source, key);
    if (typeof value === "number") return value;
  }
  return null;
}

function getDateString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = readPath(source, key);
    if (typeof value === "string" && value) return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "number") return new Date(value > 9999999999 ? value : value * 1000).toISOString();
  }
  return null;
}

function readPath(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
}
