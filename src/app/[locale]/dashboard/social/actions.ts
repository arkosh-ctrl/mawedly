"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_PLATFORMS } from "@/lib/social/platforms";

// Save the merchant's public social profile links. One form submits all
// platforms at once: a non-empty https URL upserts the row, an empty field
// deletes it. Ownership is enforced by RLS AND the explicit business lookup
// (same defense-in-depth as services/providers actions).

export type SaveSocialLinksResult = {
  status: "success" | "error";
  messageKey: string;
};

const MAX_URL_LENGTH = 300;

function isValidProfileUrl(url: string): boolean {
  if (url.length > MAX_URL_LENGTH) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function saveSocialLinks(
  formData: FormData,
): Promise<SaveSocialLinksResult> {
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return { status: "error", messageKey: "unauthorized" };

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!business) return { status: "error", messageKey: "noBusiness" };

    // Validate everything BEFORE writing anything.
    const entries: { platform: string; url: string }[] = [];
    const removals: string[] = [];
    for (const platform of PROFILE_PLATFORMS) {
      const raw = String(formData.get(platform) ?? "").trim();
      if (!raw) {
        removals.push(platform);
        continue;
      }
      if (!isValidProfileUrl(raw)) {
        return { status: "error", messageKey: "invalidUrl" };
      }
      entries.push({ platform, url: raw });
    }

    if (entries.length > 0) {
      const { error } = await supabase.from("business_social_links").upsert(
        entries.map((e) => ({
          business_id: business.id,
          platform: e.platform,
          url: e.url,
          is_active: true,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "business_id,platform" },
      );
      if (error) return { status: "error", messageKey: "saveFailed" };
    }

    if (removals.length > 0) {
      const { error } = await supabase
        .from("business_social_links")
        .delete()
        .eq("business_id", business.id)
        .in("platform", removals);
      if (error) return { status: "error", messageKey: "saveFailed" };
    }

    revalidatePath("/[locale]/dashboard/social", "page");
    return { status: "success", messageKey: "saved" };
  } catch {
    return { status: "error", messageKey: "saveFailed" };
  }
}
