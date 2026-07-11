"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPlanState } from "@/lib/billing/gate";

// Enterprise branding: upload a logo (private brand-assets bucket) and/or set
// an accent hex color for the public booking page. Plan-gated server-side.

export type BrandingResult = {
  status: "success" | "error";
  messageKey: string;
};

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export async function saveBranding(
  formData: FormData,
): Promise<BrandingResult> {
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return { status: "error", messageKey: "unauthorized" };

    const state = await getPlanState(supabase, userId);
    if (!state) return { status: "error", messageKey: "noBusiness" };
    if (!state.plan.features.branding) {
      return { status: "error", messageKey: "brandingNotInPlan" };
    }

    // Color (optional; empty clears it).
    const colorRaw = String(formData.get("brand_color") ?? "").trim();
    if (colorRaw && !HEX_RE.test(colorRaw)) {
      return { status: "error", messageKey: "invalidColor" };
    }

    // Logo (optional).
    const file = formData.get("logo");
    let logoPath: string | undefined;
    if (file instanceof File && file.size > 0) {
      const ext = ALLOWED_LOGO_TYPES[file.type];
      if (!ext) return { status: "error", messageKey: "invalidLogoType" };
      if (file.size > MAX_LOGO_BYTES) {
        return { status: "error", messageKey: "logoTooLarge" };
      }
      const path = `${state.businessId}/logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("brand-assets")
        .upload(path, file, { contentType: file.type });
      if (uploadError) return { status: "error", messageKey: "saveFailed" };
      logoPath = path;
    }

    const { error } = await supabase
      .from("businesses")
      .update({
        brand_color: colorRaw || null,
        ...(logoPath ? { brand_logo_path: logoPath } : {}),
      })
      .eq("id", state.businessId);
    if (error) return { status: "error", messageKey: "saveFailed" };

    revalidatePath("/[locale]/dashboard/billing", "page");
    return { status: "success", messageKey: "brandingSaved" };
  } catch {
    return { status: "error", messageKey: "saveFailed" };
  }
}
