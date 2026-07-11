// Monthly appointment usage — LAZY RESET, no cron. usage_reset_at stores the
// first day of the month the counter belongs to; whenever a caller touches
// usage in a newer month the counter is zeroed first. Pure helpers here are
// unit-tested (tests/billing-usage.test.mjs); the DB wrappers below run on
// the service_role client inside /api/book and on the authenticated client
// in the dashboard.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { effectivePlan } from "./plans";

export type UsageRow = {
  id: string;
  plan: string;
  subscription_status: string;
  monthly_appointments_count: number;
  usage_reset_at: string;
};

export type Usage = {
  used: number;
  /** -1 = unlimited. */
  limit: number;
  /** 0..100 (0 when unlimited). */
  percentage: number;
  atLimit: boolean;
  nearLimit: boolean;
};

/** First day of the month of `now`, as YYYY-MM-DD (Gulf-agnostic: month
 * boundaries use UTC — a booking around midnight on the 1st lands within a
 * couple of hours of the merchant's wall clock, acceptable for quotas). */
export function currentPeriodStart(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/** The counter value AFTER applying lazy reset (pure — no I/O). */
export function effectiveCount(
  row: Pick<UsageRow, "monthly_appointments_count" | "usage_reset_at">,
  now: Date = new Date(),
): number {
  return row.usage_reset_at >= currentPeriodStart(now)
    ? row.monthly_appointments_count
    : 0;
}

export function computeUsage(row: UsageRow, now: Date = new Date()): Usage {
  const plan = effectivePlan(row.plan, row.subscription_status);
  const used = effectiveCount(row, now);
  const limit = plan.appointmentsLimit;
  const unlimited = limit === -1;
  const percentage = unlimited
    ? 0
    : Math.min(100, Math.round((used / limit) * 100));
  return {
    used,
    limit,
    percentage,
    atLimit: !unlimited && used >= limit,
    nearLimit: !unlimited && used < limit && percentage >= 80,
  };
}

type AnyClient = SupabaseClient<Database>;

/** Read a business's usage (applies lazy reset in memory; the row itself is
 * only rewritten by recordAppointmentUsage to keep reads cheap). */
export async function getBusinessUsage(
  client: AnyClient,
  businessId: string,
): Promise<Usage | null> {
  const { data } = await client
    .from("businesses")
    .select(
      "id, plan, subscription_status, monthly_appointments_count, usage_reset_at",
    )
    .eq("id", businessId)
    .maybeSingle();
  if (!data) return null;
  return computeUsage(data as UsageRow);
}

/** Increment the monthly counter after a successful booking insert, resetting
 * it first when the stored month is stale. Best-effort by design: a failed
 * bump must never undo a real booking, so callers don't gate on the result. */
export async function recordAppointmentUsage(
  client: AnyClient,
  row: UsageRow,
): Promise<void> {
  const period = currentPeriodStart();
  const next = effectiveCount(row) + 1;
  const { error } = await client
    .from("businesses")
    .update({
      monthly_appointments_count: next,
      usage_reset_at: period,
    })
    .eq("id", row.id);
  if (error) {
    console.error("[billing] usage increment failed", {
      businessId: row.id,
      error: error.message,
    });
  }
}
