"use server";

import { createClient } from "@/lib/supabase/server";
import type { SharePlatform } from "./platforms";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LOGGABLE_PLATFORMS: SharePlatform[] = [
  "whatsapp",
  "x",
  "telegram",
  "snapchat",
  "facebook",
  "linkedin",
  "instagram",
  "native",
];

export type LogShareResult = { status: "success" | "error" };

// Best-effort share log (merchant stats). RLS scopes the insert to the
// caller's own business; a failure here must never block the share itself,
// so the caller fire-and-forgets this action.
export async function logReviewShare(
  reviewId: string,
  platform: SharePlatform,
): Promise<LogShareResult> {
  try {
    if (
      !UUID_RE.test(String(reviewId ?? "")) ||
      !LOGGABLE_PLATFORMS.includes(platform)
    ) {
      return { status: "error" };
    }

    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return { status: "error" };

    const [{ data: business }, { data: review }] = await Promise.all([
      supabase
        .from("businesses")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("reviews")
        .select("id, business_id")
        .eq("id", reviewId)
        .maybeSingle(),
    ]);
    if (!business || !review || review.business_id !== business.id) {
      return { status: "error" };
    }

    const { error } = await supabase.from("social_shares").insert({
      business_id: business.id,
      review_id: reviewId,
      platform,
    });
    return { status: error ? "error" : "success" };
  } catch {
    return { status: "error" };
  }
}
