import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { gulfNow } from "@/lib/booking/availability";

export type ContactRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  company: string | null;
  linkedin_url: string | null;
  timezone: string | null;
  country: string | null;
  city: string | null;
  notes: string | null;
  source: string;
  is_favorite: boolean;
  created_at: string | null;
  meetingCount: number;
  lastMeeting: string | null;
  nextMeeting: string | null;
};

export type ContactMeeting = {
  id: string;
  date: string;
  start_time: string;
  status: string;
  service: string | null;
};

export type SentEmailRow = {
  id: string;
  subject: string;
  to_email: string;
  status: string;
  sent_at: string | null;
};

const COMPLETED = new Set(["completed", "confirmed"]);

// Resolve the signed-in merchant's business id (contacts are business-scoped).
export async function resolveBusinessId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) return null;
  const { data } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

type CustomerDbRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  company: string | null;
  linkedin_url: string | null;
  timezone: string | null;
  country: string | null;
  city: string | null;
  notes: string | null;
  source: string;
  is_favorite: boolean;
  created_at: string | null;
};

const CONTACT_COLS =
  "id, name, email, phone, job_title, company, linkedin_url, timezone, country, city, notes, source, is_favorite, created_at";

// List contacts for a business with computed meeting stats. Search + favorite
// filter applied in SQL; stats computed from a single appointments read.
export async function listContacts(
  supabase: SupabaseClient,
  businessId: string,
  opts: { search?: string; favorite?: boolean } = {},
): Promise<ContactRow[]> {
  let q = supabase
    .from("customers")
    .select(CONTACT_COLS)
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (opts.favorite) q = q.eq("is_favorite", true);
  if (opts.search && opts.search.trim()) {
    const s = opts.search.trim().replace(/[%,]/g, "");
    q = q.or(`name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`);
  }

  const { data } = await q.returns<CustomerDbRow[]>();
  const rows = data ?? [];
  if (rows.length === 0) return [];

  // One appointments read for the whole business → compute stats per customer.
  const { data: appts } = await supabase
    .from("appointments")
    .select("customer_id, status, appointment_date")
    .eq("business_id", businessId)
    .returns<{ customer_id: string; status: string; appointment_date: string }[]>();

  const { date: today } = gulfNow();
  const count = new Map<string, number>();
  const last = new Map<string, string>();
  const next = new Map<string, string>();
  for (const a of appts ?? []) {
    if (COMPLETED.has(a.status)) {
      count.set(a.customer_id, (count.get(a.customer_id) ?? 0) + 1);
      const prev = last.get(a.customer_id);
      if (a.appointment_date <= today && (!prev || a.appointment_date > prev)) {
        last.set(a.customer_id, a.appointment_date);
      }
    }
    if (a.status === "confirmed" && a.appointment_date >= today) {
      const prevN = next.get(a.customer_id);
      if (!prevN || a.appointment_date < prevN) next.set(a.customer_id, a.appointment_date);
    }
  }

  return rows.map((r) => ({
    ...r,
    meetingCount: count.get(r.id) ?? 0,
    lastMeeting: last.get(r.id) ?? null,
    nextMeeting: next.get(r.id) ?? null,
  }));
}

export async function getContactMeetings(
  supabase: SupabaseClient,
  businessId: string,
  contactId: string,
): Promise<ContactMeeting[]> {
  const { data } = await supabase
    .from("appointments")
    .select("id, appointment_date, start_time, status, services(name)")
    .eq("business_id", businessId)
    .eq("customer_id", contactId)
    .order("appointment_date", { ascending: false })
    .returns<
      {
        id: string;
        appointment_date: string;
        start_time: string;
        status: string;
        services: { name: string } | null;
      }[]
    >();
  return (data ?? []).map((a) => ({
    id: a.id,
    date: a.appointment_date,
    start_time: a.start_time?.slice(0, 5) ?? "",
    status: a.status,
    service: a.services?.name ?? null,
  }));
}

export async function getSentEmails(
  supabase: SupabaseClient,
  businessId: string,
  contactId: string,
): Promise<SentEmailRow[]> {
  const { data } = await supabase
    .from("sent_emails")
    .select("id, subject, to_email, status, sent_at")
    .eq("business_id", businessId)
    .eq("customer_id", contactId)
    .order("sent_at", { ascending: false })
    .limit(50)
    .returns<SentEmailRow[]>();
  return data ?? [];
}
