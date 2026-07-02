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

// Customer "booking confirmed" email — sent only when transitioning TO
// 'confirmed', and only if the customer left an email. Best-effort: runs after
// the action returns and never affects its result.
type ConfirmedApptRow = {
  appointment_date: string;
  start_time: string;
  customers: { name: string; email: string | null } | null;
  services: { name: string } | null;
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
        "appointment_date, start_time, customers(name, email), services(name), providers(name)",
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
    const { subject, html, text } = bookingCustomerConfirmedEmail({
      lang,
      businessName: biz?.name ?? "",
      serviceName: appt.services?.name ?? "",
      providerName: appt.providers?.name ?? "",
      date: appt.appointment_date,
      time: appt.start_time,
      whatsappPhone: biz?.phone ?? null,
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
