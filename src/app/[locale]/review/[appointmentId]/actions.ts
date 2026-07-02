"use server";

import { createClient } from "@/lib/supabase/server";
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
    });
    if (!parsed.success) {
      return { status: "error", messageKey: "failed" };
    }
    const { appointmentId, rating, comment } = parsed.data;

    const supabase = await createClient();
    // No .select(): anon has no SELECT grant/policy on reviews, and we don't need
    // the row back. business_id is omitted — the trigger derives it.
    const { error } = await supabase.from("reviews").insert({
      appointment_id: appointmentId,
      rating,
      comment,
    });
    if (error) {
      return { status: "error", messageKey: "failed" };
    }

    return { status: "success", messageKey: "thanks" };
  } catch {
    return { status: "error", messageKey: "failed" };
  }
}
