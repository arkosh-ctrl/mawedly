import "server-only";

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { BLOCKING_STATUSES } from "@/lib/appointments/status";
import { isReservedSlug } from "./reserved-slugs";
import { timeToMinutes, type MinuteRange } from "./availability";

export type PublicBusiness = {
  id: string;
  name: string;
  type: string;
  /** Free-text merchant intro shown under the name (may be empty). */
  tagline: string | null;
  /** Practitioner verification — drives the public trust badge. */
  requires_license: boolean;
  verification_status: string;
  license_number: string | null;
  license_issuer: string | null;
  work_start: string;
  work_end: string;
  /** Plan id — drives public-page feature gating (social icons, branding). */
  plan: string;
  subscription_status: string;
  brand_logo_path: string | null;
  brand_color: string | null;
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

export type PublicSocialLink = {
  platform: string;
  url: string;
};

// Resolve a slug to its (active) business. Returns ONLY non-sensitive fields —
// bank details are never exposed here; they are fetched separately after a
// successful booking.
//
// WRAPPED IN cache(): generateMetadata and the page body both need the
// business, and Next calls them as two separate invocations. Without this,
// every booking page would issue the same Supabase query twice. React's cache()
// dedupes per request — a plain Supabase call is not a fetch(), so Next's own
// request-level deduplication does not cover it.
export const getBusinessForBooking = cache(async function getBusinessForBooking(
  slug: string,
): Promise<PublicBusiness | null> {
  if (isReservedSlug(slug)) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("businesses")
    .select(
      "id, name, type, tagline, requires_license, verification_status, license_number, license_issuer, work_start, work_end, is_active, plan, subscription_status, brand_logo_path, brand_color",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!data || data.is_active === false) return null;
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    tagline: data.tagline ?? null,
    requires_license: data.requires_license ?? false,
    verification_status: data.verification_status ?? "not_required",
    license_number: data.license_number ?? null,
    license_issuer: data.license_issuer ?? null,
    work_start: data.work_start,
    work_end: data.work_end,
    plan: data.plan,
    subscription_status: data.subscription_status,
    brand_logo_path: data.brand_logo_path,
    brand_color: data.brand_color,
  };
});

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

// Signed URL for an enterprise brand logo (private bucket; short-lived —
// regenerated on every public-page render).
export async function getBrandLogoUrl(path: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.storage
    .from("brand-assets")
    .createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

// The merchant's public social profiles — shown as icons on the booking page.
export async function getActiveSocialLinks(
  businessId: string,
): Promise<PublicSocialLink[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("business_social_links")
    .select("platform, url")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("platform", { ascending: true });
  return (data ?? []) as PublicSocialLink[];
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

/**
 * Raised when a booking query fails at the database level. Carries the Postgres
 * SQLSTATE so callers can separate bad input (e.g. 22007 — an invalid date
 * literal that passed the shape check) from a genuine outage, instead of
 * silently reading both as "nothing is booked".
 */
export class BookingQueryError extends Error {
  readonly pgCode: string | undefined;

  constructor(message: string, pgCode?: string) {
    super(message);
    this.name = "BookingQueryError";
    this.pgCode = pgCode;
  }
}

// Blocking appointments for a provider on a date, as minute ranges.
// `excludeAppointmentId` drops one appointment from the result — used when
// rescheduling so the appointment being moved doesn't block its own slot (and
// the ones adjacent to it) in the availability grid.
export async function getBookedRanges(
  businessId: string,
  providerId: string,
  date: string,
  options?: { excludeAppointmentId?: string },
): Promise<MinuteRange[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("appointments")
    .select("start_time, end_time")
    .eq("business_id", businessId)
    .eq("provider_id", providerId)
    .eq("appointment_date", date)
    .in("status", BLOCKING_STATUSES);
  if (options?.excludeAppointmentId) {
    query = query.neq("id", options.excludeAppointmentId);
  }
  const { data, error } = await query;
  // Never swallow this: an empty result and a failed query look identical to
  // the availability grid, and "no bookings" wrongly reads as "all free".
  if (error) throw new BookingQueryError(error.message, error.code);

  return (data ?? []).map((a) => ({
    start: timeToMinutes(a.start_time),
    end: timeToMinutes(a.end_time),
  }));
}
