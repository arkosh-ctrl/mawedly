"use server";

import { createClient } from "@/lib/supabase/server";
import {
  ALLOWED_TRANSITIONS,
  isAppointmentStatus,
  type AppointmentStatus,
} from "@/lib/appointments/status";

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
