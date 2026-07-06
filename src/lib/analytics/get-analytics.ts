import "server-only";

import { createClient } from "@/lib/supabase/server";
import { calculateKPIs } from "./kpi-calculator";
import type { AnalyticsAppointmentRow, AnalyticsData } from "./types";

const GULF_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

function gulfDate(offsetDays: number): string {
  return new Date(Date.now() + GULF_OFFSET_MS + offsetDays * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function toMinutes(t: string | null | undefined, fallback: number): number {
  if (!t) return fallback;
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m);
}

const SELECT =
  "status, appointment_date, start_time, created_at, deposit_verified, services(price, duration_minutes)";

/**
 * Fetch + compute the merchant's analytics for a window. RLS-scoped (the server
 * client only sees the owner's rows). Returns null when the merchant has no
 * business yet. Shared by the analytics page and the dashboard scorecards.
 */
export async function getAnalytics(
  periodDays: number,
): Promise<AnalyticsData | null> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;

  const { data: business } = await supabase
    .from("businesses")
    .select("id, work_start, work_end")
    .eq("user_id", userId ?? "")
    .maybeSingle();
  if (!business) return null;

  const currentStart = gulfDate(-(periodDays - 1));
  const previousStart = gulfDate(-(periodDays * 2 - 1));
  const previousEnd = gulfDate(-periodDays);
  const today = gulfDate(0);
  const heatmapStart = gulfDate(-89);

  const [{ data: current }, { data: previous }, { data: heat }, providers] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(SELECT)
        .eq("business_id", business.id)
        .gte("appointment_date", currentStart)
        .lte("appointment_date", today)
        .returns<AnalyticsAppointmentRow[]>(),
      supabase
        .from("appointments")
        .select(SELECT)
        .eq("business_id", business.id)
        .gte("appointment_date", previousStart)
        .lte("appointment_date", previousEnd)
        .returns<AnalyticsAppointmentRow[]>(),
      supabase
        .from("appointments")
        .select(SELECT)
        .eq("business_id", business.id)
        .gte("appointment_date", heatmapStart)
        .lte("appointment_date", today)
        .returns<AnalyticsAppointmentRow[]>(),
      supabase
        .from("providers")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .eq("is_active", true),
    ]);

  return calculateKPIs(current ?? [], previous ?? [], periodDays, heat ?? [], {
    workStartMinutes: toMinutes(business.work_start, 9 * 60),
    workEndMinutes: toMinutes(business.work_end, 21 * 60),
    providerCount: providers.count ?? 1,
  });
}
