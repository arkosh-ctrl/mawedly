import { NextResponse, type NextRequest, after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { bookingSchema } from "@/lib/booking/schema";
import {
  BookingQueryError,
  getBusinessForBooking,
  getActiveService,
  providerBelongsToBusiness,
  getBookedRanges,
} from "@/lib/booking/queries";
import {
  computeAvailableSlots,
  gulfNow,
  type MinuteRange,
} from "@/lib/booking/availability";
import { hashPhone } from "@/lib/booking/phone-hash";
import { INITIAL_APPOINTMENT_STATUS } from "@/lib/appointments/status";
import {
  computeUsage,
  recordAppointmentUsage,
  type UsageRow,
} from "@/lib/billing/usage";
import { hasFeature } from "@/lib/billing/plans";
import { sendEmail } from "@/lib/email/resend";
import { bookingMerchantEmail } from "@/lib/email/templates/booking-merchant";
import { createNotification } from "@/lib/notifications/create";
import { logSystemEvent } from "@/lib/admin/log-event";

const RATE_LIMIT_MAX = 15; // attempts per IP ...
const PHONE_RATE_LIMIT_MAX = 5; // ... and per (slug, phone) ...
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // ... per 10 minutes
// Nobody books a haircut three years out; an unbounded future date is only ever
// calendar spam. The DB CHECK from migration 0031 is the belt behind this.
const MAX_HORIZON_DAYS = 365;

// The caller's IP, from the most trustworthy header available.
//
// NEVER the first entry of x-forwarded-for: that end of the list is written by
// the client, so it is a free rate-limit reset. Vercel's own header comes first,
// then x-real-ip, then the LAST x-forwarded-for entry — the hop appended by the
// proxy closest to us.
function clientIp(request: NextRequest): string {
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwarded) {
    const first = vercelForwarded.split(",")[0].trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",");
    const last = hops[hops.length - 1].trim();
    if (last) return last;
  }

  return "unknown";
}

type RateLimitVerdict = "ok" | "limited";

/**
 * Record this attempt and check both rate-limit dimensions: per IP, and per
 * (slug, phone_hash) — the second one survives a spoofed IP because it is keyed
 * on data the booking itself must carry.
 *
 * Fail-open BUT VISIBLE: supabase-js resolves with { error } instead of
 * throwing, so a broken attempts table would otherwise disable rate limiting in
 * complete silence. Every failure path here logs rate_limit_store_degraded
 * before letting the request through.
 */
async function enforceRateLimits(
  supabase: SupabaseClient<Database>,
  args: { ip: string; slug: string; phoneHash: string },
): Promise<RateLimitVerdict> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  let degraded: string | null = null;

  try {
    // Recorded BEFORE the business is resolved, so probes with a random
    // serviceId still count against the limit. The 24h prune in
    // /api/cron/reminders keeps the table from growing without bound.
    const { error: insertError } = await supabase
      .from("booking_attempts")
      .insert({ ip: args.ip, slug: args.slug, phone_hash: args.phoneHash });
    if (insertError) degraded = insertError.message;

    const ipAttempts = await supabase
      .from("booking_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", args.ip)
      .gte("created_at", since);
    if (ipAttempts.error) degraded ??= ipAttempts.error.message;

    const phoneAttempts = await supabase
      .from("booking_attempts")
      .select("id", { count: "exact", head: true })
      .eq("slug", args.slug)
      .eq("phone_hash", args.phoneHash)
      .gte("created_at", since);
    if (phoneAttempts.error) degraded ??= phoneAttempts.error.message;

    if (degraded === null) {
      // Strictly greater-than: this attempt is already recorded above.
      if ((ipAttempts.count ?? 0) > RATE_LIMIT_MAX) return "limited";
      if ((phoneAttempts.count ?? 0) > PHONE_RATE_LIMIT_MAX) return "limited";
      return "ok";
    }
  } catch (e) {
    degraded = e instanceof Error ? e.message : String(e);
  }

  await logSystemEvent({
    scope: "booking_api",
    event: "rate_limit_store_degraded",
    level: "warn",
    meta: { error: degraded.slice(0, 300) },
  });
  return "ok";
}

/** Gulf-local YYYY-MM-DD, `days` after `date`. */
function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

type CustomerResolution = { ok: true; id: string } | { ok: false };

/**
 * Find or create the customer row for (business_id, phone) WITHOUT ever writing
 * to an existing one.
 *
 * This endpoint is anonymous: the only thing an attacker needs to reach a given
 * row is the public slug plus the victim's phone number. An upsert here let them
 * rewrite that customer's name and email — and customers.email is where booking
 * confirmations (including the video room password), reschedule notices and
 * review requests are sent. So an existing row contributes its id and nothing
 * else; name/email changes are the merchant's to make from Contacts.
 */
async function resolveCustomerId(
  supabase: SupabaseClient<Database>,
  args: {
    businessId: string;
    phone: string;
    name: string;
    email: string | null;
  },
): Promise<CustomerResolution> {
  // Deliberately NOT filtered by deleted_at: a soft-deleted row still holds the
  // unique (business_id, phone) key, so skipping it would only push us into a
  // 23505 we cannot resolve. The row stays soft-deleted — an anonymous booking
  // must not resurrect a contact the merchant removed.
  const existing = await supabase
    .from("customers")
    .select("id")
    .eq("business_id", args.businessId)
    .eq("phone", args.phone)
    .maybeSingle();
  if (existing.data) return { ok: true, id: existing.data.id };
  if (existing.error) return { ok: false };

  const inserted = await supabase
    .from("customers")
    .insert({
      business_id: args.businessId,
      name: args.name,
      phone: args.phone,
      email: args.email,
    })
    .select("id")
    .single();
  if (inserted.data) return { ok: true, id: inserted.data.id };

  // 23505 = a concurrent booking created the same (business_id, phone) between
  // our read and this insert. Re-read rather than failing an honest customer.
  if (inserted.error?.code === "23505") {
    const retried = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", args.businessId)
      .eq("phone", args.phone)
      .maybeSingle();
    if (retried.data) return { ok: true, id: retried.data.id };
  }

  return { ok: false };
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const ip = clientIp(request);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    raw = {};
  }

  // 1) Validate FIRST. A malformed form (e.g. a typo'd phone) must NOT consume
  // an honest customer's rate-limit budget — only genuine attempts are counted.
  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalidInput" }, { status: 400 });
  }
  const v = parsed.data;

  const phone = v.customerPhone.replace(/\D/g, "");
  if (phone.length < 10 || phone.length > 15) {
    return NextResponse.json({ error: "invalidInput" }, { status: 400 });
  }

  const now = gulfNow();
  if (v.date < now.date) {
    return NextResponse.json({ error: "pastDate" }, { status: 400 });
  }
  if (v.date > addDays(now.date, MAX_HORIZON_DAYS)) {
    return NextResponse.json({ error: "invalidInput" }, { status: 400 });
  }

  // 2) Rate limit — two dimensions, both recorded before the business is even
  // resolved so that probing costs the prober something.
  const verdict = await enforceRateLimits(supabase, {
    ip,
    slug: v.slug,
    phoneHash: hashPhone(phone),
  });
  if (verdict === "limited") {
    return NextResponse.json({ error: "rateLimited" }, { status: 429 });
  }

  // 3) Resolve + verify ownership of service/provider.
  const business = await getBusinessForBooking(v.slug);
  if (!business) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  const service = await getActiveService(business.id, v.serviceId);
  if (!service) {
    return NextResponse.json({ error: "invalidInput" }, { status: 400 });
  }
  const okProvider = await providerBelongsToBusiness(business.id, v.providerId);
  if (!okProvider) {
    return NextResponse.json({ error: "invalidInput" }, { status: 400 });
  }

  // 3b) Subscription quota (lazy monthly reset — src/lib/billing/usage.ts).
  // The customer sees a calendar-is-full message; the upgrade pitch lives in
  // the MERCHANT dashboard, not here.
  //
  // ORDER MATTERS: this runs only AFTER the service and provider check out.
  // Answering 403 to a request carrying a random serviceId would turn the
  // endpoint into a reconnaissance channel — 404 vs 403 vs 400 would tell an
  // anonymous caller which merchants exist and which have hit their plan
  // ceiling, i.e. their plan tier and roughly their monthly volume.
  const { data: usageRow } = await supabase
    .from("businesses")
    .select(
      "id, plan, subscription_status, monthly_appointments_count, usage_reset_at",
    )
    .eq("id", business.id)
    .maybeSingle();
  if (usageRow && computeUsage(usageRow as UsageRow).atLimit) {
    return NextResponse.json({ error: "monthlyLimitReached" }, { status: 403 });
  }

  // 4) Friendly availability re-check (the DB constraint is the hard guard).
  let booked: MinuteRange[];
  try {
    booked = await getBookedRanges(business.id, v.providerId, v.date);
  } catch (e) {
    // 22007/22008 = invalid / out-of-range datetime literal: input Postgres
    // rejects, not an outage. Everything else is a real failure and must not be
    // disguised as "bad input".
    if (
      e instanceof BookingQueryError &&
      (e.pgCode === "22007" || e.pgCode === "22008")
    ) {
      return NextResponse.json({ error: "invalidInput" }, { status: 400 });
    }
    await logSystemEvent({
      scope: "booking_api",
      event: "availability query failed",
      level: "error",
      meta: {
        code: e instanceof BookingQueryError ? (e.pgCode ?? null) : null,
        error: (e instanceof Error ? e.message : String(e)).slice(0, 300),
      },
      businessId: business.id,
    });
    return NextResponse.json({ error: "saveFailed" }, { status: 500 });
  }

  const slots = computeAvailableSlots({
    workStart: business.work_start,
    workEnd: business.work_end,
    durationMinutes: service.duration_minutes,
    booked,
    minStartMinutes: v.date === now.date ? now.minutes : 0,
  });
  if (!slots.includes(v.startTime)) {
    return NextResponse.json({ error: "slotTaken" }, { status: 409 });
  }

  // 5) Resolve the customer by (business_id, phone) — read-or-create, never a
  // blind write over an existing row (see resolveCustomerId).
  const customer = await resolveCustomerId(supabase, {
    businessId: business.id,
    phone,
    name: v.customerName,
    email: v.customerEmail || null,
  });
  if (!customer.ok) {
    return NextResponse.json({ error: "saveFailed" }, { status: 500 });
  }

  // 6) Insert appointment (end_time computed by trigger). A race that slipped
  // past the re-check is caught here by the EXCLUSION constraint (23P01).
  const { data: appointment, error: apptError } = await supabase
    .from("appointments")
    .insert({
      business_id: business.id,
      provider_id: v.providerId,
      service_id: v.serviceId,
      customer_id: customer.id,
      appointment_date: v.date,
      start_time: v.startTime,
      status: INITIAL_APPOINTMENT_STATUS,
    })
    .select("id")
    .single();
  if (apptError) {
    if (apptError.code === "23P01") {
      return NextResponse.json({ error: "slotTaken" }, { status: 409 });
    }
    await logSystemEvent({
      scope: "booking_api",
      event: "appointment insert failed",
      level: "error",
      meta: { code: apptError.code, error: apptError.message.slice(0, 300) },
      businessId: business.id,
    });
    return NextResponse.json({ error: "saveFailed" }, { status: 500 });
  }

  // 6b) Count the booking against the monthly quota (best-effort: a failed
  // bump never undoes a real booking).
  if (usageRow) {
    await recordAppointmentUsage(supabase, usageRow as UsageRow);
  }

  // 7) Transfer + contact details — fetched ONLY now that a real appointment
  // exists. phone is the merchant's WhatsApp number; the rest drive the
  // merchant notification email.
  const { data: biz } = await supabase
    .from("businesses")
    .select(
      "bank_name, bank_iban, bank_account_name, bank_qr_path, phone, notification_email, default_language, user_id",
    )
    .eq("id", business.id)
    .single();

  let qrUrl: string | null = null;
  if (biz?.bank_qr_path) {
    const { data: signed } = await supabase.storage
      .from("bank-qrs")
      .createSignedUrl(biz.bank_qr_path, 600);
    qrUrl = signed?.signedUrl ?? null;
  }

  // 8) Notify the merchant — AFTER the response, so it never delays or fails the
  // booking. A duplicate submit already failed at the EXCLUSION insert above, so
  // this only runs for a genuinely new appointment.
  // In-app notification for the merchant's bell — independent of email, so it
  // fires even when no notification address is configured. Idempotent per
  // (appointment, type); best-effort (never throws).
  after(async () => {
    const lang = biz?.default_language === "en" ? "en" : "ar";
    await createNotification(supabase, {
      businessId: business.id,
      type: "new_booking",
      title: lang === "en" ? "🗓️ New booking" : "🗓️ حجز جديد",
      message:
        lang === "en"
          ? `${v.customerName} booked ${service.name} on ${v.date} at ${v.startTime}.`
          : `${v.customerName} حجز ${service.name} يوم ${v.date} الساعة ${v.startTime}.`,
      priority: "high",
      sourceType: "appointment",
      sourceId: appointment.id,
      actionUrl: `/${lang}/dashboard/appointments`,
      actionType: "navigate",
    });
  });

  after(async () => {
    try {
      // Automated emails are a paid-plan feature (in-app notifications above
      // fire for every plan).
      if (
        usageRow &&
        !hasFeature(usageRow.plan, usageRow.subscription_status, "emails")
      ) {
        return;
      }
      // Recipient: notification_email, else the confirmed login email.
      let to = biz?.notification_email || null;
      if (!to && biz?.user_id) {
        const { data: userRes } = await supabase.auth.admin.getUserById(
          biz.user_id,
        );
        const u = userRes?.user;
        if (u?.email && u.email_confirmed_at) to = u.email;
      }
      if (!to) return;

      const { data: prov } = await supabase
        .from("providers")
        .select("name")
        .eq("id", v.providerId)
        .maybeSingle();

      const lang = biz?.default_language === "en" ? "en" : "ar";
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      const { subject, html, text } = bookingMerchantEmail({
        lang,
        customerName: v.customerName,
        serviceName: service.name,
        providerName: prov?.name ?? "",
        date: v.date,
        time: v.startTime,
        appointmentsUrl: `${appUrl}/${lang}/dashboard/appointments`,
      });

      await sendEmail({
        to,
        subject,
        html,
        text,
        context: { booking_id: appointment.id, business_id: business.id },
      });
    } catch (e) {
      console.error(
        JSON.stringify({
          scope: "email",
          event: "merchant_notify_failed",
          booking_id: appointment.id,
          business_id: business.id,
          error_message: e instanceof Error ? e.message : String(e),
          timestamp: new Date().toISOString(),
        }),
      );
    }
  });

  return NextResponse.json({
    ok: true,
    appointmentId: appointment.id,
    deposit: Number(service.deposit_amount),
    whatsappPhone: biz?.phone ?? null,
    transfer: {
      bankName: biz?.bank_name ?? null,
      iban: biz?.bank_iban ?? null,
      accountName: biz?.bank_account_name ?? null,
      qrUrl,
    },
    // Plan-driven flags for the success screen (customer-facing extras).
    features: {
      calendar: usageRow
        ? hasFeature(usageRow.plan, usageRow.subscription_status, "calendar")
        : true,
    },
  });
}
