"use server";

import { createClient } from "@/lib/supabase/server";
import { providerSchema } from "./schema";

export type MutationResult = {
  status: "success" | "error";
  messageKey: string;
};

// Create or update a provider. business_id is derived server-side; RLS also
// restricts writes to the owner's rows.
export async function saveProvider(formData: FormData): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) return { status: "error", messageKey: "unauthorized" };

  const parsed = providerSchema.safeParse({
    name: formData.get("name"),
    title: formData.get("title") ?? "",
  });
  if (!parsed.success) return { status: "error", messageKey: "validationFailed" };
  const v = parsed.data;

  const id = formData.get("id");
  if (typeof id === "string" && id) {
    const { error } = await supabase
      .from("providers")
      .update({ name: v.name, title: v.title || null })
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

  const { error } = await supabase.from("providers").insert({
    business_id: business.id,
    name: v.name,
    title: v.title || null,
  });
  if (error) return { status: "error", messageKey: "saveFailed" };
  return { status: "success", messageKey: "saved" };
}

// Soft archive / re-activate (no hard delete: providers may be linked to
// appointments and is_active drives public visibility).
export async function setProviderActive(
  formData: FormData,
): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { status: "error", messageKey: "unauthorized" };

  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active")) === "true";
  if (!id) return { status: "error", messageKey: "saveFailed" };

  const { error } = await supabase
    .from("providers")
    .update({ is_active: active })
    .eq("id", id);
  if (error) return { status: "error", messageKey: "saveFailed" };

  return { status: "success", messageKey: active ? "activated" : "archived" };
}
