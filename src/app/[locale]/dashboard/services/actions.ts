"use server";

import { createClient } from "@/lib/supabase/server";
import { getPlanState } from "@/lib/billing/gate";
import { serviceSchema } from "./schema";

export type MutationResult = {
  status: "success" | "error";
  messageKey: string;
};

// Create or update a service. business_id is derived server-side (never trusted
// from the client), and every write is scoped to rows the merchant owns — RLS
// is a second layer, not the only one.
export async function saveService(formData: FormData): Promise<MutationResult> {
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return { status: "error", messageKey: "unauthorized" };

    const parsed = serviceSchema.safeParse({
      name: formData.get("name"),
      session_type: formData.get("session_type") ?? "in_person",
      duration_minutes: formData.get("duration_minutes"),
      price: formData.get("price"),
      deposit_amount: formData.get("deposit_amount"),
    });
    if (!parsed.success) {
      return { status: "error", messageKey: "validationFailed" };
    }
    const v = parsed.data;

    // The merchant's business — used to scope every write.
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!business) return { status: "error", messageKey: "noBusiness" };
    const businessId = business.id;

    // Plan gate: virtual (video) services are a paid-plan feature.
    if (v.session_type === "virtual") {
      const state = await getPlanState(supabase, userId);
      if (state && !state.plan.features.video) {
        return { status: "error", messageKey: "videoNotInPlan" };
      }
    }

    const id = formData.get("id");
    if (typeof id === "string" && id) {
      const { data: updated, error } = await supabase
        .from("services")
        .update({
          name: v.name,
          session_type: v.session_type,
          duration_minutes: v.duration_minutes,
          price: v.price,
          deposit_amount: v.deposit_amount,
        })
        .eq("id", id)
        .eq("business_id", businessId)
        .select("id");
      if (error) return { status: "error", messageKey: "saveFailed" };
      // Zero rows => the id isn't owned by this business (or doesn't exist).
      if (!updated || updated.length === 0) {
        return { status: "error", messageKey: "notFound" };
      }
      return { status: "success", messageKey: "saved" };
    }

    const { error } = await supabase.from("services").insert({
      business_id: businessId,
      name: v.name,
      session_type: v.session_type,
      duration_minutes: v.duration_minutes,
      price: v.price,
      deposit_amount: v.deposit_amount,
    });
    if (error) return { status: "error", messageKey: "saveFailed" };
    return { status: "success", messageKey: "saved" };
  } catch {
    return { status: "error", messageKey: "saveFailed" };
  }
}

// Soft archive / re-activate (no hard delete). Scoped to the owner's business
// and verified by affected-row count.
export async function setServiceActive(
  formData: FormData,
): Promise<MutationResult> {
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return { status: "error", messageKey: "unauthorized" };

    const id = String(formData.get("id") ?? "");
    const active = String(formData.get("active")) === "true";
    if (!id) return { status: "error", messageKey: "saveFailed" };

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!business) return { status: "error", messageKey: "noBusiness" };

    const { data: updated, error } = await supabase
      .from("services")
      .update({ is_active: active })
      .eq("id", id)
      .eq("business_id", business.id)
      .select("id");
    if (error) return { status: "error", messageKey: "saveFailed" };
    if (!updated || updated.length === 0) {
      return { status: "error", messageKey: "notFound" };
    }

    return { status: "success", messageKey: active ? "activated" : "archived" };
  } catch {
    return { status: "error", messageKey: "saveFailed" };
  }
}
