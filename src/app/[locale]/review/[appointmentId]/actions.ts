"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { reviewSchema } from "./schema";
import type { ReviewState } from "./types";

// Server action: submit a review from the public page. Runs as the `anon` role
// (unauthenticated visitor). All authorization is enforced by the database, not
// this code: the RLS WITH CHECK confirms the appointment is 'completed', the
// BEFORE-INSERT trigger sets business_id from the real appointment, and the
// UNIQUE(appointment_id) constraint blocks a second review. Whatever the DB
// rejects (bad/unknown id, not completed, already reviewed, RLS denial) surfaces
// as ONE generic failure — the raw exception is never leaked to the visitor.
export async function submitReview(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  try {
    const parsed = reviewSchema.safeParse({
      appointmentId: formData.get("appointmentId"),
      rating: formData.get("rating"),
      comment: formData.get("comment") ?? "",
      reviewer_name: formData.get("reviewer_name") ?? "",
      reviewer_phone: formData.get("reviewer_phone") ?? "",
    });
    if (!parsed.success) {
      return { status: "error", messageKey: "failed" };
    }
    const { appointmentId, rating, comment, reviewer_name, reviewer_phone } =
      parsed.data;

    const supabase = await createClient();
    // No .select(): anon has no SELECT grant/policy on reviews, and we don't need
    // the row back. business_id is omitted — the trigger derives it.
    const { error } = await supabase.from("reviews").insert({
      appointment_id: appointmentId,
      rating,
      comment,
      reviewer_name,
      reviewer_phone,
    });
    if (error) {
      return { status: "error", messageKey: "failed" };
    }

    // Notify the merchant of the new review (best-effort). anon can't read the
    // business, so resolve it via a service-role client from the appointment.
    try {
      const admin = createAdminClient();
      const { data: appt } = await admin
        .from("appointments")
        .select("business_id")
        .eq("id", appointmentId)
        .maybeSingle();
      if (appt?.business_id) {
        const { data: biz } = await admin
          .from("businesses")
          .select("default_language")
          .eq("id", appt.business_id)
          .maybeSingle();
        const lang = biz?.default_language === "en" ? "en" : "ar";
        const name =
          reviewer_name || (lang === "en" ? "A customer" : "عميل");
        await createNotification(admin, {
          businessId: appt.business_id,
          type: "new_review",
          title: lang === "en" ? "⭐ New review" : "⭐ تقييم جديد",
          message:
            lang === "en"
              ? `${name} rated you ${rating} out of 5.`
              : `قيّمك ${name} بـ ${rating} من ٥.`,
          priority: "medium",
          sourceType: "review",
          sourceId: appointmentId,
          actionUrl: `/${lang}/dashboard/reviews`,
          actionType: "open_review",
        });
      }
    } catch {
      // Never let a notification failure affect the review submission result.
    }

    return { status: "success", messageKey: "thanks" };
  } catch {
    return { status: "error", messageKey: "failed" };
  }
}
