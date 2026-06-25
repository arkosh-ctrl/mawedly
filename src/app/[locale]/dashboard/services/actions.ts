"use server";

import { createClient } from "@/lib/supabase/server";
import { serviceSchema } from "./schema";

export type MutationResult = {
  status: "success" | "error";
  messageKey: string;
};

// Create or update a service. business_id is derived server-side (never trusted
// from the client); RLS additionally restricts writes to the owner's rows.
export async function saveService(formData: FormData): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) return { status: "error", messageKey: "unauthorized" };

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    duration_minutes: formData.get("duration_minutes"),
    price: formData.get("price"),
    deposit_amount: formData.get("deposit_amount"),
  });
  if (!parsed.success) return { status: "error", messageKey: "validationFailed" };
  const v = parsed.data;

  const id = formData.get("id");
  if (typeof id === "string" && id) {
    const { error } = await supabase
      .from("services")
      .update({
        name: v.name,
        duration_minutes: v.duration_minutes,
        price: v.price,
        deposit_amount: v.deposit_amount,
      })
      .eq("id", id);
    if (error) return { status: "error", messageKey: "saveFailed" };
    return { status: "success", messageKey: "saved" };
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!business) return { status: "error", messageKey: "noBusiness" };

  const { error } = await supabase.from("services").insert({
    business_id: business.id,
    name: v.name,
    duration_minutes: v.duration_minutes,
    price: v.price,
    deposit_amount: v.deposit_amount,
  });
  if (error) return { status: "error", messageKey: "saveFailed" };
  return { status: "success", messageKey: "saved" };
}

// Soft archive / re-activate. We never hard-delete: services may be linked to
// appointments, and is_active drives public visibility (RLS).
export async function setServiceActive(
  formData: FormData,
): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { status: "error", messageKey: "unauthorized" };

  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active")) === "true";
  if (!id) return { status: "error", messageKey: "saveFailed" };

  const { error } = await supabase
    .from("services")
    .update({ is_active: active })
    .eq("id", id);
  if (error) return { status: "error", messageKey: "saveFailed" };

  return { status: "success", messageKey: active ? "activated" : "archived" };
}
