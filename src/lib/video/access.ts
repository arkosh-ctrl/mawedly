import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { deriveRoomName, deriveRoomPassword } from "./room-name";

export type VideoRole = "merchant" | "client";

export type VideoAccess = {
  roomName: string;
  roomPassword: string;
  displayName: string;
  domain: string; // "meet.jit.si"
  businessName: string;
  startsAt: string; // ISO
};

// Shape returned by the get_appointment_video_access RPC (migration 0014).
type AccessRow = {
  status: string;
  session_type: string;
  merchant_user_id: string;
  business_name: string;
  customer_name: string | null;
  starts_at: string;
  is_valid: boolean;
};

const JITSI_DOMAIN = "meet.jit.si";

/**
 * Resolve video access for an appointment, or null when the room isn't open
 * (wrong status, not a virtual service, or outside the ±time window — all
 * decided by the SECURITY DEFINER RPC in Gulf time). Materializes the
 * video_rooms row lazily and idempotently. Runs with the service-role client:
 * the customer path has no auth, and possession of the appointment id is the
 * capability (same model as chat/review).
 *
 * Returns the merchant's user id too so the caller (merchant action) can verify
 * ownership before exposing anything.
 */
export async function resolveVideoAccess(
  appointmentId: string,
  role: VideoRole,
): Promise<{ access: VideoAccess; merchantUserId: string } | null> {
  // The RPC isn't in the generated Database types; use an untyped client for
  // the call and type the row locally.
  const supabase = createAdminClient() as unknown as SupabaseClient;

  const { data, error } = await supabase.rpc("get_appointment_video_access", {
    p_appointment_id: appointmentId,
    p_timezone: "Asia/Riyadh",
  });
  if (error) return null;

  const rows = (data as AccessRow[] | null) ?? [];
  const row = rows[0];
  if (!row || !row.is_valid) return null;

  const roomName = deriveRoomName(appointmentId);
  const roomPassword = deriveRoomPassword(appointmentId);
  const displayName =
    role === "merchant"
      ? row.business_name
      : row.customer_name || row.business_name;

  const now = new Date().toISOString();

  // Idempotent room row (unique on appointment_id). Never overwrites join
  // timestamps; those are set by recordJoin.
  await supabase.from("video_rooms").upsert(
    {
      appointment_id: appointmentId,
      room_name: roomName,
      status: "scheduled",
      updated_at: now,
    },
    { onConflict: "appointment_id" },
  );

  return {
    access: {
      roomName,
      roomPassword,
      displayName,
      domain: JITSI_DOMAIN,
      businessName: row.business_name,
      startsAt: row.starts_at,
    },
    merchantUserId: row.merchant_user_id,
  };
}

/** Record that a party actually entered the room (best-effort). */
export async function recordJoin(
  appointmentId: string,
  role: VideoRole,
): Promise<void> {
  const supabase = createAdminClient() as unknown as SupabaseClient;
  const now = new Date().toISOString();
  const field = role === "merchant" ? "merchant_joined_at" : "client_joined_at";
  await supabase
    .from("video_rooms")
    .update({ [field]: now, last_activity_at: now, status: "active" })
    .eq("appointment_id", appointmentId);
}

/** Build the meet.jit.si URL with the display name prefilled. */
export function buildJitsiUrl(access: VideoAccess): string {
  const params = `userInfo.displayName=${encodeURIComponent(
    access.displayName,
  )}&config.startWithAudioMuted=true`;
  return `https://${access.domain}/${access.roomName}#${params}`;
}
