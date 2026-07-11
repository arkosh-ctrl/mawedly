"use server";

import { createClient } from "@/lib/supabase/server";
import { canActivateProvider, getPlanState } from "@/lib/billing/gate";
import { providerSchema } from "./schema";

export type MutationResult = {
  status: "success" | "error";
  messageKey: string;
};

// Create or update a provider. business_id is derived server-side and every
// write is scoped to rows the merchant owns (RLS is a second layer).
export async function saveProvider(formData: FormData): Promise<MutationResult> {
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return { status: "error", messageKey: "unauthorized" };

    const parsed = providerSchema.safeParse({
      name: formData.get("name"),
      title: formData.get("title") ?? "",
    });
    if (!parsed.success) {
      return { status: "error", messageKey: "validationFailed" };
    }
    const v = parsed.data;

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!business) return { status: "error", messageKey: "noBusiness" };
    const businessId = business.id;

    const id = formData.get("id");
    if (typeof id === "string" && id) {
      const { data: updated, error } = await supabase
        .from("providers")
        .update({ name: v.name, title: v.title || null })
        .eq("id", id)
        .eq("business_id", businessId)
        .select("id");
      if (error) return { status: "error", messageKey: "saveFailed" };
      if (!updated || updated.length === 0) {
        return { status: "error", messageKey: "notFound" };
      }
      return { status: "success", messageKey: "saved" };
    }

    // Plan gate: adding a NEW provider must respect the plan ceiling
    // (free/pro = 1, center = 5, enterprise = unlimited).
    const state = await getPlanState(supabase, userId);
    if (state && !(await canActivateProvider(supabase, state))) {
      return { status: "error", messageKey: "providerLimitReached" };
    }

    const { error } = await supabase.from("providers").insert({
      business_id: businessId,
      name: v.name,
      title: v.title || null,
    });
    if (error) return { status: "error", messageKey: "saveFailed" };
    return { status: "success", messageKey: "saved" };
  } catch {
    return { status: "error", messageKey: "saveFailed" };
  }
}

// Soft archive / re-activate (no hard delete). Scoped to the owner's business
// and verified by affected-row count.
export async function setProviderActive(
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

    // Re-activating an archived provider also counts against the ceiling.
    if (active) {
      const state = await getPlanState(supabase, userId);
      if (state && !(await canActivateProvider(supabase, state))) {
        return { status: "error", messageKey: "providerLimitReached" };
      }
    }

    const { data: updated, error } = await supabase
      .from("providers")
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
