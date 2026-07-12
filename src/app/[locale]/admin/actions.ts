"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/admin/guard";
import { withAdmin } from "@/lib/admin/db";
import { logSystemEvent } from "@/lib/admin/log-event";

export type AdminActionResult =
  | { status: "success" }
  | { status: "error"; messageKey: "forbidden" | "notFound" | "saveFailed" };

/**
 * Activate or suspend a business. Full admins only (viewers are read-only).
 * Writes an audit row and mirrors to the health monitor. RLS-bypassing via the
 * service-role client, but ONLY after the admin-role check.
 */
export async function setBusinessActive(
  businessId: string,
  active: boolean,
): Promise<AdminActionResult> {
  try {
    const session = await getAdminSession();
    if (!session) return { status: "error", messageKey: "forbidden" };
    if (session.role !== "admin")
      return { status: "error", messageKey: "forbidden" };

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("businesses")
      .update({ is_active: active })
      .eq("id", businessId)
      .select("id");

    if (error) return { status: "error", messageKey: "saveFailed" };
    if (!data || data.length === 0)
      return { status: "error", messageKey: "notFound" };

    // Audit trail (best-effort — a missing table must not fail the action).
    try {
      await withAdmin(admin)
        .from("admin_actions")
        .insert({
          admin_user_id: session.userId,
          action: active ? "activate_business" : "suspend_business",
          target_type: "business",
          target_id: businessId,
          meta: {},
        });
    } catch {
      // ignore — the primary state change already succeeded.
    }

    await logSystemEvent({
      scope: "system",
      event: active ? "business activated" : "business suspended",
      level: "info",
      meta: { by: session.userId },
      businessId,
    });

    try {
      revalidatePath("/[locale]/admin/businesses", "page");
    } catch {
      // revalidation is a nicety; the client also calls router.refresh().
    }

    return { status: "success" };
  } catch {
    return { status: "error", messageKey: "saveFailed" };
  }
}

/**
 * Approve or reject a practitioner's license verification. Full admins only.
 * "verified" stamps license_verified_at; "rejected" clears it. Audited +
 * mirrored to the health monitor, service-role after the role check.
 */
export async function setVerificationStatus(
  businessId: string,
  approve: boolean,
): Promise<AdminActionResult> {
  try {
    const session = await getAdminSession();
    if (!session) return { status: "error", messageKey: "forbidden" };
    if (session.role !== "admin")
      return { status: "error", messageKey: "forbidden" };

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("businesses")
      .update({
        verification_status: approve ? "verified" : "rejected",
        license_verified_at: approve ? new Date().toISOString() : null,
      })
      .eq("id", businessId)
      .eq("requires_license", true)
      .select("id");

    if (error) return { status: "error", messageKey: "saveFailed" };
    if (!data || data.length === 0)
      return { status: "error", messageKey: "notFound" };

    try {
      await withAdmin(admin)
        .from("admin_actions")
        .insert({
          admin_user_id: session.userId,
          action: approve ? "verify_license" : "reject_license",
          target_type: "business",
          target_id: businessId,
          meta: {},
        });
    } catch {
      // ignore — the primary state change already succeeded.
    }

    await logSystemEvent({
      scope: "system",
      event: approve ? "license verified" : "license rejected",
      level: "info",
      meta: { by: session.userId },
      businessId,
    });

    try {
      revalidatePath("/[locale]/admin/verifications", "page");
    } catch {
      // revalidation is a nicety; the client also calls router.refresh().
    }

    return { status: "success" };
  } catch {
    return { status: "error", messageKey: "saveFailed" };
  }
}
