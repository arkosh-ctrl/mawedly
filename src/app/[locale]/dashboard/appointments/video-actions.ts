"use server";

import { createClient } from "@/lib/supabase/server";
import {
  resolveVideoAccess,
  recordJoin,
  buildJitsiUrl,
} from "@/lib/video/access";

export type MerchantVideoResult =
  | {
      status: "success";
      roomName: string;
      roomPassword: string;
      jitsiUrl: string;
    }
  | { status: "error"; messageKey: string };

/**
 * Merchant "join consultation" action. Authenticated; ownership is verified
 * both by comparing the RPC's merchant_user_id to the session user and by the
 * fact that only the owner could reach this dashboard. Records the merchant's
 * join and returns the room details + prefilled Jitsi URL.
 */
export async function getMerchantVideoAccess(
  appointmentId: string,
): Promise<MerchantVideoResult> {
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return { status: "error", messageKey: "unauthorized" };

    const resolved = await resolveVideoAccess(appointmentId, "merchant");
    if (!resolved) return { status: "error", messageKey: "roomUnavailable" };
    if (resolved.merchantUserId !== userId) {
      return { status: "error", messageKey: "unauthorized" };
    }

    await recordJoin(appointmentId, "merchant");

    return {
      status: "success",
      roomName: resolved.access.roomName,
      roomPassword: resolved.access.roomPassword,
      jitsiUrl: buildJitsiUrl(resolved.access),
    };
  } catch {
    return { status: "error", messageKey: "roomUnavailable" };
  }
}
