import { NextResponse, type NextRequest, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookingSchema } from "@/lib/booking/schema";
import {
  getBusinessForBooking,
  getActiveService,
  providerBelongsToBusiness,
  getBookedRanges,
} from "@/lib/booking/queries";
import { computeAvailableSlots, gulfNow } from "@/lib/booking/availability";
import { INITIAL_APPOINTMENT_STATUS } from "@/lib/appointments/status";
import { sendEmail } from "@/lib/email/resend";
import { bookingMerchantEmail } from "@/lib/email/templates/booking-merchant";

const RATE_LIMIT_MAX = 15; // attempts ...
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // ... per 10 minutes per IP

function clientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
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

  // 2) Rate limit — only validated booking attempts count. Record this attempt,
  // then count attempts from this IP within the window (this one included).
  try {
    await supabase.from("booking_attempts").insert({ ip, slug: v.slug });
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count } = await supabase
      .from("booking_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", since);
    if ((count ?? 0) > RATE_LIMIT_MAX) {
      return NextResponse.json({ error: "rateLimited" }, { status: 429 });
    }
  } catch {
    // Fail open: a rate-limit store hiccup must not block real bookings. The
    // EXCLUSION constraint still guarantees data integrity.
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

  // 4) Friendly availability re-check (the DB constraint is the hard guard).
  const booked = await getBookedRanges(business.id, v.providerId, v.date);
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

  // 5) Upsert customer by (business_id, phone).
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .upsert(
      {
        business_id: business.id,
        name: v.customerName,
        phone,
        email: v.customerEmail || null,
      },
      { onConflict: "business_id,phone" },
    )
    .select("id")
    .single();
  if (customerError || !customer) {
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
    return NextResponse.json({ error: "saveFailed" }, { status: 500 });
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
  after(async () => {
    try {
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
  });
}
