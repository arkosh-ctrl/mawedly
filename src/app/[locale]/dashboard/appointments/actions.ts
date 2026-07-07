"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  ALLOWED_TRANSITIONS,
  isAppointmentStatus,
  type AppointmentStatus,
} from "@/lib/appointments/status";
import { sendEmail } from "@/lib/email/resend";
import { bookingCustomerConfirmedEmail } from "@/lib/email/templates/booking-customer-confirmed";
import { reviewRequestEmail } from "@/lib/email/templates/review-request";
import { rescheduleCustomerEmail } from "@/lib/email/templates/reschedule-customer";
import { rescheduleMerchantEmail } from "@/lib/email/templates/reschedule-merchant";
import { getBookedRanges } from "@/lib/booking/queries";
import { computeAvailableSlots, gulfNow } from "@/lib/booking/availability";
import { deriveRoomPassword } from "@/lib/video/room-name";
import { getCalendarEvent } from "@/lib/calendar/get-event";
import { buildIcs } from "@/lib/calendar/ics";

// Customer "booking confirmed" email — sent only when transitioning TO
// 'confirmed', and only if the customer left an email. Best-effort: runs after
// the action returns and never affects its result.
type ConfirmedApptRow = {
  appointment_date: string;
  start_time: string;
  customers: { name: string; email: string | null } | null;
  services: { name: string; session_type: string | null } | null;
  providers: { name: string } | null;
};

async function notifyCustomerConfirmed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  appointmentId: string,
  businessId: string,
) {
  try {
    const { data: rawAppt } = await supabase
      .from("appointments")
      .select(
        "appointment_date, start_time, customers(name, email), services(name, session_type), providers(name)",
      )
      .eq("id", appointmentId)
      .eq("business_id", businessId)
      .maybeSingle();
    const appt = rawAppt as ConfirmedApptRow | null;
    const to = appt?.customers?.email;
    if (!appt || !to) return;

    const { data: biz } = await supabase
      .from("businesses")
      .select("name, phone, default_language")
      .eq("id", businessId)
      .maybeSingle();

    const lang = biz?.default_language === "en" ? "en" : "ar";
    const requestHeaders = await headers();
    const origin =
      requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    const chatUrl = `${origin}/${lang}/chat/${appointmentId}`;

    // Virtual services get a consultation link + room password in the email.
    const isVirtual = appt.services?.session_type === "virtual";
    const consultationUrl = isVirtual
      ? `${origin}/${lang}/consultation/${appointmentId}`
      : undefined;
    const consultationPassword = isVirtual
      ? deriveRoomPassword(appointmentId)
      : undefined;

    const { subject, html, text } = bookingCustomerConfirmedEmail({
      lang,
      businessName: biz?.name ?? "",
      serviceName: appt.services?.name ?? "",
      providerName: appt.providers?.name ?? "",
      date: appt.appointment_date,
      time: appt.start_time,
      whatsappPhone: biz?.phone ?? null,
      chatUrl,
      consultationUrl,
      consultationPassword,
    });

    // Attach an .ics so the customer's mail client offers "add to calendar".
    let attachments;
    try {
      const event = await getCalendarEvent(appointmentId);
      if (event) {
        attachments = [
          {
            filename: `mawedly-${appointmentId.slice(0, 8)}.ics`,
            content: buildIcs(event),
            contentType: "text/calendar",
          },
        ];
      }
    } catch {
      // ICS is a nicety — never block the confirmation email.
    }

    await sendEmail({
      to,
      subject,
      html,
      text,
      attachments,
      context: { booking_id: appointmentId, business_id: businessId },
    });
  } catch (e) {
    console.error(
      JSON.stringify({
        scope: "email",
        event: "customer_confirm_failed",
        booking_id: appointmentId,
        business_id: businessId,
        error_message: e instanceof Error ? e.message : String(e),
        timestamp: new Date().toISOString(),
      }),
    );
  }
}

// Customer "rate your visit" email — sent only when transitioning TO
// 'completed', and only if the customer left an email. Best-effort and fully
// try/catch-wrapped: a failure never affects the status change. The link points
// at the public review page; the appointment id is the only thing it carries.
type ReviewApptRow = { customers: { email: string | null } | null };

async function notifyReviewRequest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  appointmentId: string,
  businessId: string,
) {
  try {
    const { data: rawAppt } = await supabase
      .from("appointments")
      .select("customers(email)")
      .eq("id", appointmentId)
      .eq("business_id", businessId)
      .maybeSingle();
    const to = (rawAppt as ReviewApptRow | null)?.customers?.email;
    if (!to) return;

    const { data: biz } = await supabase
      .from("businesses")
      .select("name, default_language")
      .eq("id", businessId)
      .maybeSingle();

    const lang = biz?.default_language === "en" ? "en" : "ar";
    const requestHeaders = await headers();
    const origin =
      requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    const reviewUrl = `${origin}/${lang}/review/${appointmentId}`;

    const { subject, html, text } = reviewRequestEmail({
      lang,
      businessName: biz?.name ?? "",
      reviewUrl,
    });

    await sendEmail({
      to,
      subject,
      html,
      text,
      context: { booking_id: appointmentId, business_id: businessId },
    });
  } catch (e) {
    console.error(
      JSON.stringify({
        scope: "email",
        event: "review_request_failed",
        booking_id: appointmentId,
        business_id: businessId,
        error_message: e instanceof Error ? e.message : String(e),
        timestamp: new Date().toISOString(),
      }),
    );
  }
}

// Customer "your appointment was rescheduled" email — sent after a successful
// reschedule, only if the customer left an email. Best-effort and fully
// try/catch-wrapped: a failure never affects the reschedule result. Reuses the
// same embedded-row shape as notifyCustomerConfirmed.
async function notifyCustomerRescheduled(
  supabase: Awaited<ReturnType<typeof createClient>>,
  appointmentId: string,
  businessId: string,
) {
  try {
    const { data: rawAppt } = await supabase
      .from("appointments")
      .select(
        "appointment_date, start_time, customers(name, email), services(name, session_type), providers(name)",
      )
      .eq("id", appointmentId)
      .eq("business_id", businessId)
      .maybeSingle();
    const appt = rawAppt as ConfirmedApptRow | null;
    const to = appt?.customers?.email;
    if (!appt || !to) return;

    const { data: biz } = await supabase
      .from("businesses")
      .select("name, phone, default_language")
      .eq("id", businessId)
      .maybeSingle();

    const lang = biz?.default_language === "en" ? "en" : "ar";
    const requestHeaders = await headers();
    const origin =
      requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    const chatUrl = `${origin}/${lang}/chat/${appointmentId}`;
    const { subject, html, text } = rescheduleCustomerEmail({
      lang,
      businessName: biz?.name ?? "",
      serviceName: appt.services?.name ?? "",
      providerName: appt.providers?.name ?? "",
      date: appt.appointment_date,
      time: appt.start_time,
      whatsappPhone: biz?.phone ?? null,
      chatUrl,
    });

    await sendEmail({
      to,
      subject,
      html,
      text,
      context: { booking_id: appointmentId, business_id: businessId },
    });
  } catch (e) {
    console.error(
      JSON.stringify({
        scope: "email",
        event: "customer_reschedule_failed",
        booking_id: appointmentId,
        business_id: businessId,
        error_message: e instanceof Error ? e.message : String(e),
        timestamp: new Date().toISOString(),
      }),
    );
  }
}

// Merchant "appointment rescheduled" confirmation — sent after a successful
// reschedule. Recipient: notification_email, else the merchant's login email
// (from the session claims). Best-effort and fully try/catch-wrapped.
type MerchantRescheduleRow = {
  appointment_date: string;
  start_time: string;
  customers: { name: string } | null;
  services: { name: string } | null;
  providers: { name: string } | null;
};

async function notifyMerchantRescheduled(
  supabase: Awaited<ReturnType<typeof createClient>>,
  appointmentId: string,
  businessId: string,
  loginEmail: string | undefined,
) {
  try {
    const { data: biz } = await supabase
      .from("businesses")
      .select("name, notification_email, default_language")
      .eq("id", businessId)
      .maybeSingle();
    const to = biz?.notification_email || loginEmail || null;
    if (!to) return;

    const { data: rawAppt } = await supabase
      .from("appointments")
      .select(
        "appointment_date, start_time, customers(name), services(name), providers(name)",
      )
      .eq("id", appointmentId)
      .eq("business_id", businessId)
      .maybeSingle();
    const appt = rawAppt as MerchantRescheduleRow | null;
    if (!appt) return;

    const lang = biz?.default_language === "en" ? "en" : "ar";
    const requestHeaders = await headers();
    const origin =
      requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    const appointmentsUrl = `${origin}/${lang}/dashboard/appointments`;

    const { subject, html, text } = rescheduleMerchantEmail({
      lang,
      customerName: appt.customers?.name ?? "",
      serviceName: appt.services?.name ?? "",
      providerName: appt.providers?.name ?? "",
      date: appt.appointment_date,
      time: appt.start_time,
      appointmentsUrl,
    });

    await sendEmail({
      to,
      subject,
      html,
      text,
      context: { booking_id: appointmentId, business_id: businessId },
    });
  } catch (e) {
    console.error(
      JSON.stringify({
        scope: "email",
        event: "merchant_reschedule_failed",
        booking_id: appointmentId,
        business_id: businessId,
        error_message: e instanceof Error ? e.message : String(e),
        timestamp: new Date().toISOString(),
      }),
    );
  }
}

export type MutationResult = {
  status: "success" | "error";
  messageKey: string;
};

const STATUS_SUCCESS_KEY: Partial<Record<AppointmentStatus, string>> = {
  confirmed: "appointmentConfirmed",
  completed: "appointmentCompleted",
  no_show: "appointmentNoShow",
  canceled: "appointmentCanceled",
};

// Change an appointment's status. Ownership is enforced explicitly (not RLS
// alone): we look up the merchant's business, confirm the row belongs to it,
// validate the transition against ALLOWED_TRANSITIONS, then update scoped by
// business_id and verify a row was affected.
export async function setAppointmentStatus(
  formData: FormData,
): Promise<MutationResult> {
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return { status: "error", messageKey: "unauthorized" };

    const id = String(formData.get("id") ?? "");
    const newStatus = String(formData.get("status") ?? "");
    if (!id || !isAppointmentStatus(newStatus)) {
      return { status: "error", messageKey: "invalidInput" };
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!business) return { status: "error", messageKey: "noBusiness" };

    // Current status of the OWNED row (scoped by business_id).
    const { data: current } = await supabase
      .from("appointments")
      .select("status")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle();
    if (!current) return { status: "error", messageKey: "notFound" };

    const allowed =
      ALLOWED_TRANSITIONS[current.status as AppointmentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      return { status: "error", messageKey: "invalidTransition" };
    }

    const { data: updated, error } = await supabase
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", id)
      .eq("business_id", business.id)
      .select("id");
    if (error) {
      // Defensive: a status change that re-occupies a now-taken slot would trip
      // the EXCLUSION constraint. Surface a clear message instead of a raw error.
      if (error.code === "23P01") {
        return { status: "error", messageKey: "slotConflict" };
      }
      return { status: "error", messageKey: "saveFailed" };
    }
    if (!updated || updated.length === 0) {
      return { status: "error", messageKey: "notFound" };
    }

    // Email the customer only when the appointment becomes confirmed. Awaited
    // directly (server-action `after()` doesn't fire reliably here); the helper
    // is fully try/catch-wrapped so a failure never changes the result.
    if (newStatus === "confirmed") {
      await notifyCustomerConfirmed(supabase, id, business.id);
    }
    // Review request fires once, on the terminal 'completed' transition. The
    // state machine makes 'completed' terminal (status.ts), so this can never
    // run twice for the same appointment.
    if (newStatus === "completed") {
      await notifyReviewRequest(supabase, id, business.id);
    }

    return {
      status: "success",
      messageKey: STATUS_SUCCESS_KEY[newStatus] ?? "saved",
    };
  } catch {
    return { status: "error", messageKey: "saveFailed" };
  }
}

// Mark the deposit as received (or clear it). Independent of status — no
// "must verify deposit before confirming" rule in V1.
export async function setDepositVerified(
  formData: FormData,
): Promise<MutationResult> {
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return { status: "error", messageKey: "unauthorized" };

    const id = String(formData.get("id") ?? "");
    const verified = String(formData.get("verified")) === "true";
    if (!id) return { status: "error", messageKey: "invalidInput" };

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!business) return { status: "error", messageKey: "noBusiness" };

    const { data: updated, error } = await supabase
      .from("appointments")
      .update({ deposit_verified: verified })
      .eq("id", id)
      .eq("business_id", business.id)
      .select("id");
    if (error) return { status: "error", messageKey: "saveFailed" };
    if (!updated || updated.length === 0) {
      return { status: "error", messageKey: "notFound" };
    }

    return {
      status: "success",
      messageKey: verified ? "depositVerified" : "depositCleared",
    };
  } catch {
    return { status: "error", messageKey: "saveFailed" };
  }
}

// Shared reschedule core: verify the owned appointment is confirmed, then compute
// the bookable start times for `date` using the SAME availability logic as public
// booking (computeAvailableSlots + gulfNow) — with the appointment itself excluded
// from the booked ranges so it doesn't block its own/adjacent slots. Returns the
// slots (empty for a past date) plus the resolved businessId, or an error key.
async function computeReschedule(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  appointmentId: string,
  date: string,
): Promise<
  { ok: true; businessId: string; slots: string[] } | { ok: false; messageKey: string }
> {
  const { data: business } = await supabase
    .from("businesses")
    .select("id, work_start, work_end")
    .eq("user_id", userId)
    .maybeSingle();
  if (!business) return { ok: false, messageKey: "noBusiness" };

  const { data: current } = await supabase
    .from("appointments")
    .select("status, provider_id, service_id")
    .eq("id", appointmentId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!current) return { ok: false, messageKey: "notFound" };
  // Only confirmed appointments are reschedulable (status is unchanged by the
  // reschedule — we assert 'confirmed' directly, not via ALLOWED_TRANSITIONS).
  if (current.status !== "confirmed") {
    return { ok: false, messageKey: "cannotReschedule" };
  }

  const { data: service } = await supabase
    .from("services")
    .select("duration_minutes")
    .eq("id", current.service_id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!service) return { ok: false, messageKey: "saveFailed" };

  const now = gulfNow();
  if (date < now.date) return { ok: true, businessId: business.id, slots: [] };

  const booked = await getBookedRanges(
    business.id,
    current.provider_id,
    date,
    { excludeAppointmentId: appointmentId },
  );
  const slots = computeAvailableSlots({
    workStart: business.work_start,
    workEnd: business.work_end,
    durationMinutes: service.duration_minutes,
    booked,
    minStartMinutes: date === now.date ? now.minutes : 0,
  });
  return { ok: true, businessId: business.id, slots };
}

export type RescheduleSlotsResult =
  | { status: "success"; slots: string[] }
  | { status: "error"; messageKey: string };

// Available start times for rescheduling an owned, confirmed appointment to
// `date`. Owner-scoped (authenticated session); the appointment's own slot is
// included (self-excluded from booked ranges). Used to populate the dialog grid.
export async function getRescheduleSlots(
  appointmentId: string,
  date: string,
): Promise<RescheduleSlotsResult> {
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return { status: "error", messageKey: "unauthorized" };

    if (!appointmentId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { status: "error", messageKey: "invalidInput" };
    }

    const res = await computeReschedule(supabase, userId, appointmentId, date);
    if (!res.ok) return { status: "error", messageKey: res.messageKey };
    return { status: "success", slots: res.slots };
  } catch {
    return { status: "error", messageKey: "saveFailed" };
  }
}

// Move a confirmed appointment to a new date/time. Only appointment_date and
// start_time change — status stays 'confirmed' and the deposit is untouched
// (end_time is recomputed by the DB trigger). Ownership is enforced explicitly
// (business_id filter) plus RLS; the friendly availability re-check mirrors
// api/book, and the EXCLUSION constraint (23P01) is the final guard against a
// slot taken between grid render and save.
export async function rescheduleAppointment(
  formData: FormData,
): Promise<MutationResult> {
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return { status: "error", messageKey: "unauthorized" };

    const id = String(formData.get("id") ?? "");
    const date = String(formData.get("date") ?? "");
    const startTime = String(formData.get("startTime") ?? "");
    if (
      !id ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !/^\d{2}:\d{2}$/.test(startTime)
    ) {
      return { status: "error", messageKey: "invalidInput" };
    }

    const now = gulfNow();
    if (date < now.date) return { status: "error", messageKey: "pastDate" };

    const res = await computeReschedule(supabase, userId, id, date);
    if (!res.ok) return { status: "error", messageKey: res.messageKey };
    // Friendly re-check: the DB constraint is the hard guard, but this gives a
    // clear message if the chosen time is no longer offered.
    if (!res.slots.includes(startTime)) {
      return { status: "error", messageKey: "slotUnavailable" };
    }

    const { data: updated, error } = await supabase
      .from("appointments")
      .update({ appointment_date: date, start_time: startTime })
      .eq("id", id)
      .eq("business_id", res.businessId)
      .select("id");
    if (error) {
      // A slot taken between grid render and save trips the EXCLUSION
      // constraint — surface a clear conflict message, never a silent failure.
      if (error.code === "23P01") {
        return { status: "error", messageKey: "slotConflict" };
      }
      return { status: "error", messageKey: "saveFailed" };
    }
    if (!updated || updated.length === 0) {
      return { status: "error", messageKey: "notFound" };
    }

    // Notify customer + merchant. Awaited directly (server-action `after()`
    // doesn't fire reliably here); both helpers are fully try/catch-wrapped so a
    // failure never changes the result.
    await notifyCustomerRescheduled(supabase, id, res.businessId);
    await notifyMerchantRescheduled(
      supabase,
      id,
      res.businessId,
      claims?.claims?.email as string | undefined,
    );

    return { status: "success", messageKey: "appointmentRescheduled" };
  } catch {
    return { status: "error", messageKey: "saveFailed" };
  }
}
