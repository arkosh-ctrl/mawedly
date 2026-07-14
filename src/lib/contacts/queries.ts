import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { gulfNow } from "@/lib/booking/availability";

export type ContactList = { id: string; name: string; color: string | null };
export type CustomFieldDef = { id: string; name: string; key: string; type: string };

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
  custom_fields: Record<string, string>;
  created_at: string | null;
  meetingCount: number;
  lastMeeting: string | null;
  nextMeeting: string | null;
  lists: ContactList[];
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
  custom_fields: Record<string, string> | null;
  created_at: string | null;
};

const CONTACT_COLS =
  "id, name, email, phone, job_title, company, linkedin_url, timezone, country, city, notes, source, is_favorite, custom_fields, created_at";

// List contacts for a business with computed meeting stats. Search + favorite
// filter applied in SQL; stats computed from a single appointments read.
export async function listContacts(
  supabase: SupabaseClient,
  businessId: string,
  opts: { search?: string; favorite?: boolean; listId?: string } = {},
): Promise<ContactRow[]> {
  // When filtering by list, resolve the member contact ids first.
  let memberIds: string[] | null = null;
  if (opts.listId) {
    const { data: members } = await supabase
      .from("contact_list_members")
      .select("contact_id")
      .eq("list_id", opts.listId)
      .returns<{ contact_id: string }[]>();
    memberIds = (members ?? []).map((m) => m.contact_id);
    if (memberIds.length === 0) return [];
  }

  let q = supabase
    .from("customers")
    .select(CONTACT_COLS)
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (opts.favorite) q = q.eq("is_favorite", true);
  if (memberIds) q = q.in("id", memberIds);
  if (opts.search && opts.search.trim()) {
    const s = opts.search.trim().replace(/[%,]/g, "");
    q = q.or(`name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`);
  }

  const { data } = await q.returns<CustomerDbRow[]>();
  const rows = data ?? [];
  if (rows.length === 0) return [];

  // List memberships for these contacts (business-scoped lists).
  const { data: lists } = await supabase
    .from("contact_lists")
    .select("id, name, color")
    .eq("business_id", businessId)
    .returns<ContactList[]>();
  const listById = new Map((lists ?? []).map((l) => [l.id, l]));
  const { data: memberships } = await supabase
    .from("contact_list_members")
    .select("contact_id, list_id")
    .in("contact_id", rows.map((r) => r.id))
    .returns<{ contact_id: string; list_id: string }[]>();
  const listsByContact = new Map<string, ContactList[]>();
  for (const m of memberships ?? []) {
    const l = listById.get(m.list_id);
    if (!l) continue;
    const arr = listsByContact.get(m.contact_id) ?? [];
    arr.push(l);
    listsByContact.set(m.contact_id, arr);
  }

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
    custom_fields: r.custom_fields ?? {},
    meetingCount: count.get(r.id) ?? 0,
    lastMeeting: last.get(r.id) ?? null,
    nextMeeting: next.get(r.id) ?? null,
    lists: listsByContact.get(r.id) ?? [],
  }));
}

export async function getLists(
  supabase: SupabaseClient,
  businessId: string,
): Promise<ContactList[]> {
  const { data } = await supabase
    .from("contact_lists")
    .select("id, name, color")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true })
    .returns<ContactList[]>();
  return data ?? [];
}

export async function getCustomFields(
  supabase: SupabaseClient,
  businessId: string,
): Promise<CustomFieldDef[]> {
  const { data } = await supabase
    .from("custom_field_definitions")
    .select("id, name, key, type")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true })
    .returns<CustomFieldDef[]>();
  return data ?? [];
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
