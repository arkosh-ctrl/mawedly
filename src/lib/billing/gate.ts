import "server-only";

// Server-side plan gate — one query, used by server actions and pages to
// decide feature access. Client components never gate (the server re-checks
// everything anyway).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { effectivePlan, type Plan } from "./plans";

export type PlanState = {
  businessId: string;
  plan: Plan;
  /** Raw column value (may be a paid id while status is past_due etc). */
  planId: string;
  subscriptionStatus: string;
};

export async function getPlanState(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<PlanState | null> {
  const { data } = await client
    .from("businesses")
    .select("id, plan, subscription_status")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    businessId: data.id,
    plan: effectivePlan(data.plan, data.subscription_status),
    planId: data.plan,
    subscriptionStatus: data.subscription_status,
  };
}

/** Count of ACTIVE providers vs the plan ceiling. -1 = unlimited. */
export async function canActivateProvider(
  client: SupabaseClient<Database>,
  state: PlanState,
): Promise<boolean> {
  const limit = state.plan.providersLimit;
  if (limit === -1) return true;
  const { count } = await client
    .from("providers")
    .select("id", { count: "exact", head: true })
    .eq("business_id", state.businessId)
    .eq("is_active", true);
  return (count ?? 0) < limit;
}
