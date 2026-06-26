import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { BLOCKING_STATUSES } from "@/lib/appointments/status";
import { isReservedSlug } from "./reserved-slugs";
import { timeToMinutes, type MinuteRange } from "./availability";

export type PublicBusiness = {
  id: string;
  name: string;
  type: string;
  work_start: string;
  work_end: string;
};

export type PublicService = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  deposit_amount: number;
};

export type PublicProvider = {
  id: string;
  name: string;
  title: string | null;
};

// Resolve a slug to its (active) business. Returns ONLY non-sensitive fields —
// bank details are never exposed here; they are fetched separately after a
// successful booking.
export async function getBusinessForBooking(
  slug: string,
): Promise<PublicBusiness | null> {
  if (isReservedSlug(slug)) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("businesses")
    .select("id, name, type, work_start, work_end, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (!data || data.is_active === false) return null;
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    work_start: data.work_start,
    work_end: data.work_end,
  };
}

export async function getActiveServices(
  businessId: string,
): Promise<PublicService[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price, deposit_amount")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  return (data ?? []) as PublicService[];
}

export async function getActiveProviders(
  businessId: string,
): Promise<PublicProvider[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("providers")
    .select("id, name, title")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  return (data ?? []) as PublicProvider[];
}

// One active service of a business (used to read its duration server-side).
export async function getActiveService(
  businessId: string,
  serviceId: string,
): Promise<PublicService | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price, deposit_amount")
    .eq("id", serviceId)
    .eq("business_id", businessId)
    .eq("is_active", true)
    .maybeSingle();
  return (data as PublicService | null) ?? null;
}

// Confirm a provider belongs to the business and is active.
export async function providerBelongsToBusiness(
  businessId: string,
  providerId: string,
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("providers")
    .select("id")
    .eq("id", providerId)
    .eq("business_id", businessId)
    .eq("is_active", true)
    .maybeSingle();
  return Boolean(data);
}

// Blocking appointments for a provider on a date, as minute ranges.
export async function getBookedRanges(
  businessId: string,
  providerId: string,
  date: string,
): Promise<MinuteRange[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("appointments")
    .select("start_time, end_time")
    .eq("business_id", businessId)
    .eq("provider_id", providerId)
    .eq("appointment_date", date)
    .in("status", BLOCKING_STATUSES);

  return (data ?? []).map((a) => ({
    start: timeToMinutes(a.start_time),
    end: timeToMinutes(a.end_time),
  }));
}
