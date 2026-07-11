import "server-only";

// Minimal Lemon Squeezy API client — plain fetch, no SDK dependency.
// Docs: https://docs.lemonsqueezy.com/api
// All calls are server-side only (API key must never reach the client).

import { isPlanId, PLANS, type PlanId } from "./plans";

const API_BASE = "https://api.lemonsqueezy.com/v1";

function apiKey(): string {
  const key = process.env.LEMONSQUEEZY_API_KEY;
  if (!key) throw new Error("LEMONSQUEEZY_API_KEY is not set");
  return key;
}

async function lsFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey()}`,
      ...init?.headers,
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      `Lemon Squeezy ${path} failed (${res.status}): ${JSON.stringify(body?.errors ?? body)}`,
    );
  }
  return body;
}

/** variant id (from env) for a paid plan. */
export function variantIdForPlan(plan: PlanId): string | null {
  const envName = PLANS[plan].lemonVariantEnv;
  if (!envName) return null;
  return process.env[envName] ?? null;
}

/** plan id for a Lemon variant id (webhooks send the variant back). */
export function planForVariantId(variantId: string): PlanId | null {
  for (const plan of Object.values(PLANS)) {
    if (!plan.lemonVariantEnv) continue;
    if (process.env[plan.lemonVariantEnv] === variantId) return plan.id;
  }
  return null;
}

export function assertPlanId(value: string): PlanId {
  if (!isPlanId(value)) throw new Error(`unknown plan: ${value}`);
  return value;
}

/** Create a hosted checkout for a business + plan. Returns the checkout URL.
 * business_id travels in checkout custom data and comes back inside every
 * subscription webhook (meta.custom_data). */
export async function createCheckout(params: {
  plan: PlanId;
  businessId: string;
  email?: string | null;
  redirectUrl: string;
}): Promise<string> {
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  if (!storeId) throw new Error("LEMONSQUEEZY_STORE_ID is not set");
  const variantId = variantIdForPlan(params.plan);
  if (!variantId) throw new Error(`no variant configured for ${params.plan}`);

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          ...(params.email ? { email: params.email } : {}),
          custom: { business_id: params.businessId },
        },
        product_options: {
          redirect_url: params.redirectUrl,
        },
      },
      relationships: {
        store: { data: { type: "stores", id: storeId } },
        variant: { data: { type: "variants", id: variantId } },
      },
    },
  };

  const res = await lsFetch("/checkouts", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const url = res?.data?.attributes?.url;
  if (!url) throw new Error("checkout response had no url");
  return url;
}

/** Signed Customer Portal URL for an existing subscription (expires quickly —
 * fetched on demand, never stored). */
export async function getCustomerPortalUrl(
  subscriptionId: string,
): Promise<string | null> {
  const res = await lsFetch(`/subscriptions/${subscriptionId}`);
  return res?.data?.attributes?.urls?.customer_portal ?? null;
}
