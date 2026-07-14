"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeleteAccountResult =
  | { status: "success" }
  | { status: "error"; messageKey: "unauthorized" | "deleteFailed" };

const OWNED_BUCKETS = ["bank-qrs", "deposits", "licenses"] as const;

/**
 * DSAR — permanently delete the signed-in merchant's account and all their data.
 * Deleting the auth user cascades the businesses row (FK ON DELETE CASCADE),
 * which in turn cascades providers, services, and appointments. Private storage
 * objects live under a "{businessId}/" folder, so we best-effort purge those
 * first (they aren't covered by the DB cascade).
 */
export async function deleteMyAccount(): Promise<DeleteAccountResult> {
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub as string | undefined;
    if (!userId) return { status: "error", messageKey: "unauthorized" };

    const admin = createAdminClient();

    // Find the business (for storage-folder cleanup) under the user's session.
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    // Best-effort: remove every private object under the business folder.
    if (business?.id) {
      for (const bucket of OWNED_BUCKETS) {
        try {
          const { data: files } = await admin.storage
            .from(bucket)
            .list(business.id, { limit: 1000 });
          const paths = (files ?? []).map((f) => `${business.id}/${f.name}`);
          if (paths.length > 0) {
            await admin.storage.from(bucket).remove(paths);
          }
        } catch {
          // storage cleanup is best-effort; continue to the account deletion.
        }
      }
    }

    // Deleting the auth user cascades all DB rows via FK ON DELETE CASCADE.
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { status: "error", messageKey: "deleteFailed" };

    // Clear the local session cookie so the client lands logged-out.
    try {
      await supabase.auth.signOut();
    } catch {
      // the user is already gone; ignore.
    }

    return { status: "success" };
  } catch {
    return { status: "error", messageKey: "deleteFailed" };
  }
}
