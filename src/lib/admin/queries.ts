import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { withAdmin } from "./db";
import type { AdminRole, SystemEvent } from "./types";

const GULF_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

function gulfDate(offsetDays = 0): string {
  return new Date(Date.now() + GULF_OFFSET_MS + offsetDays * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export type PlatformOverview = {
  businessesTotal: number;
  businessesActive: number;
  customersTotal: number;
  appointmentsTotal: number;
  byStatus: Record<string, number>;
  bookingsToday: number;
  bookingsThisWeek: number;
  bookingsThisMonth: number;
  // null for viewers (financial data hidden — PDPL).
  revenueTotal: number | null;
};

type ApptRow = {
  appointment_date: string;
  status: string;
  services: { price: number } | null;
};

/** Platform-wide KPIs. Revenue is only returned to full admins. */
export async function getPlatformOverview(
  role: AdminRole,
): Promise<PlatformOverview> {
  const supabase = createAdminClient();

  const [biz, activeBiz, customers, appts] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase
      .from("businesses")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase
      .from("appointments")
      .select("appointment_date, status, services(price)")
      .returns<ApptRow[]>(),
  ]);

  const rows = appts.data ?? [];
  const today = gulfDate(0);
  const weekStart = gulfDate(-6);
  const monthStart = today.slice(0, 7);

  const byStatus: Record<string, number> = {};
  let revenue = 0;
  let bToday = 0;
  let bWeek = 0;
  let bMonth = 0;

  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    if (r.status === "completed") revenue += Number(r.services?.price) || 0;
    if (r.appointment_date === today) bToday++;
    if (r.appointment_date >= weekStart && r.appointment_date <= today) bWeek++;
    if (r.appointment_date.startsWith(monthStart)) bMonth++;
  }

  return {
    businessesTotal: biz.count ?? 0,
    businessesActive: activeBiz.count ?? 0,
    customersTotal: customers.count ?? 0,
    appointmentsTotal: rows.length,
    byStatus,
    bookingsToday: bToday,
    bookingsThisWeek: bWeek,
    bookingsThisMonth: bMonth,
    revenueTotal: role === "admin" ? revenue : null,
  };
}

export type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  type: string;
  plan: string;
  is_active: boolean;
  created_at: string | null;
};

/** All businesses (no bank/financial fields selected). */
export async function getPlatformBusinesses(): Promise<BusinessRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("businesses")
    .select("id, name, slug, type, plan, is_active, created_at")
    .order("created_at", { ascending: false })
    .returns<BusinessRow[]>();
  return data ?? [];
}

export type RecentAppointment = {
  id: string;
  appointment_date: string;
  start_time: string;
  status: string;
  created_at: string | null;
  businesses: { name: string } | null;
  services: { name: string } | null;
};

/** Newest appointments across the whole platform. */
export async function getRecentAppointments(
  limit = 40,
): Promise<RecentAppointment[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("appointments")
    .select(
      "id, appointment_date, start_time, status, created_at, businesses(name), services(name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<RecentAppointment[]>();
  return data ?? [];
}

export type ScopeHealth = {
  scope: string;
  lastAt: string | null;
  errors24h: number;
  warns24h: number;
};

export type SystemHealth = {
  events: SystemEvent[];
  scopes: ScopeHealth[];
};

/** Recent system events + a per-scope 24h health summary. */
export async function getSystemHealth(): Promise<SystemHealth> {
  const supabase = withAdmin(createAdminClient());
  const since = new Date(Date.now() - 7 * DAY_MS).toISOString();
  const { data } = await supabase
    .from("system_events")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);

  const events = (data as SystemEvent[]) ?? [];
  const cutoff24 = Date.now() - DAY_MS;
  const map = new Map<string, ScopeHealth>();

  for (const e of events) {
    const s = map.get(e.scope) ?? {
      scope: e.scope,
      lastAt: null,
      errors24h: 0,
      warns24h: 0,
    };
    if (!s.lastAt) s.lastAt = e.created_at; // events are DESC, first seen is newest
    if (new Date(e.created_at).getTime() >= cutoff24) {
      if (e.level === "error") s.errors24h++;
      else if (e.level === "warn") s.warns24h++;
    }
    map.set(e.scope, s);
  }

  return { events, scopes: [...map.values()] };
}
