import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { withAdmin, type AdminActionRow } from "./db";
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

export type SubscriberStatus =
  | "active"
  | "trial"
  | "trial_expired"
  | "suspended";

export type Subscriber = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  plan: string;
  trialEndsAt: string | null;
  isActive: boolean;
  createdAt: string | null;
  appointments: number;
  lastActivity: string | null; // latest appointment created_at
  status: SubscriberStatus;
};

function subscriberStatus(
  isActive: boolean,
  plan: string,
  trialEndsAt: string | null,
): SubscriberStatus {
  if (!isActive) return "suspended";
  const trialLive = trialEndsAt ? new Date(trialEndsAt).getTime() > Date.now() : false;
  if (plan !== "free") return "active";
  return trialLive ? "trial" : "trial_expired";
}

/**
 * Subscriber (merchant) contact directory for admin outreach. Admin-role only.
 * Emails come from auth (service-role); status is derived from plan + trial
 * window + is_active (there is no billing system — deposits are manual).
 */
export async function getSubscribers(): Promise<Subscriber[]> {
  const supabase = createAdminClient();

  const [{ data: bizRows }, { data: apptRows }] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, user_id, name, phone, plan, trial_ends_at, is_active, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("appointments").select("business_id, created_at"),
  ]);

  const businesses = bizRows ?? [];

  // Aggregate appointment counts + last activity per business.
  const counts = new Map<string, number>();
  const lastAt = new Map<string, string>();
  for (const a of apptRows ?? []) {
    counts.set(a.business_id, (counts.get(a.business_id) ?? 0) + 1);
    const prev = lastAt.get(a.business_id);
    if (a.created_at && (!prev || a.created_at > prev)) {
      lastAt.set(a.business_id, a.created_at);
    }
  }

  // Resolve login emails (service-role only).
  const emailByUser = new Map<string, string | null>();
  await Promise.all(
    [...new Set(businesses.map((b) => b.user_id))].map(async (uid) => {
      const { data } = await supabase.auth.admin.getUserById(uid);
      emailByUser.set(uid, data?.user?.email ?? null);
    }),
  );

  return businesses.map((b) => ({
    id: b.id,
    name: b.name,
    phone: b.phone,
    email: emailByUser.get(b.user_id) ?? null,
    plan: b.plan,
    trialEndsAt: b.trial_ends_at,
    isActive: b.is_active ?? true,
    createdAt: b.created_at,
    appointments: counts.get(b.id) ?? 0,
    lastActivity: lastAt.get(b.id) ?? null,
    status: subscriberStatus(b.is_active ?? true, b.plan, b.trial_ends_at),
  }));
}

export type AuditEntry = AdminActionRow & {
  admin_email: string | null;
  business_name: string | null;
};

/** Recent admin management actions, enriched with admin email + business name. */
export async function getAuditLog(limit = 100): Promise<AuditEntry[]> {
  const supabase = withAdmin(createAdminClient());
  const { data } = await supabase
    .from("admin_actions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data as AdminActionRow[]) ?? [];
  if (rows.length === 0) return [];

  const plain = createAdminClient();
  const adminIds = [...new Set(rows.map((r) => r.admin_user_id).filter(Boolean))];
  const bizIds = [
    ...new Set(
      rows
        .filter((r) => r.target_type === "business" && r.target_id)
        .map((r) => r.target_id as string),
    ),
  ];

  const [{ data: bizRows }] = await Promise.all([
    bizIds.length
      ? plain.from("businesses").select("id, name").in("id", bizIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const bizName = new Map((bizRows ?? []).map((b) => [b.id, b.name]));

  // Emails come from auth.admin (service-role only).
  const emailById = new Map<string, string | null>();
  await Promise.all(
    adminIds.map(async (id) => {
      const { data: u } = await plain.auth.admin.getUserById(id);
      emailById.set(id, u?.user?.email ?? null);
    }),
  );

  return rows.map((r) => ({
    ...r,
    admin_email: emailById.get(r.admin_user_id) ?? null,
    business_name:
      r.target_type === "business" && r.target_id
        ? bizName.get(r.target_id) ?? null
        : null,
  }));
}
