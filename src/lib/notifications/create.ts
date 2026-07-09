import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { GULF_OFFSET_MINUTES } from "@/lib/booking/availability";
import { logSystemEvent } from "@/lib/admin/log-event";
import { withNotifications } from "./db";
import type { CreateNotificationInput, Notification, TypeSetting } from "./types";

/** Current Gulf wall-clock minutes since midnight (matches gulfNow's model). */
function gulfMinutesNow(): number {
  const iso = new Date(Date.now() + GULF_OFFSET_MINUTES * 60_000).toISOString();
  return Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

/** True when `nowMin` falls inside [start, end), handling the midnight wrap. */
function isWithinQuietHours(nowMin: number, start: string, end: string): boolean {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (s === e) return false;
  return s < e ? nowMin >= s && nowMin < e : nowMin >= s || nowMin < e;
}

/**
 * Central notification writer. Called SERVER-SIDE only, from the integration
 * points (booking route, appointment/chat/review actions, cron). Accepts any
 * server client — pass the service-role admin client from RLS-bypassing paths
 * (booking route, cron), or the authenticated server client from owner actions.
 *
 * Honors the merchant's per-type switch and quiet hours, and is idempotent per
 * (source_id, type) via the DB unique index — a duplicate insert is swallowed,
 * which is what lets the reminder cron run repeatedly.
 *
 * Best-effort by contract: returns null instead of throwing, so a notification
 * failure never breaks the booking / status change that triggered it.
 */
export async function createNotification(
  baseClient: SupabaseClient<Database>,
  input: CreateNotificationInput,
): Promise<Notification | null> {
  const supabase = withNotifications(baseClient);

  try {
    const { data: settings } = await supabase
      .from("notification_settings")
      .select(
        "type_settings, quiet_hours_enabled, quiet_hours_start, quiet_hours_end",
      )
      .eq("business_id", input.businessId)
      .maybeSingle();

    // Per-type switch: only skip when the merchant EXPLICITLY disabled in_app.
    // Missing keys (e.g. a newly added type) default to enabled.
    const typeConfig = settings?.type_settings?.[input.type] as
      | TypeSetting
      | undefined;
    if (typeConfig && typeConfig.in_app === false) return null;

    // Quiet hours downgrade the priority to 'low' so the client won't play a
    // sound; the notification itself is still delivered to the bell.
    let priority = input.priority ?? "medium";
    if (
      settings?.quiet_hours_enabled &&
      isWithinQuietHours(
        gulfMinutesNow(),
        settings.quiet_hours_start,
        settings.quiet_hours_end,
      )
    ) {
      priority = "low";
    }

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        business_id: input.businessId,
        source_type: input.sourceType,
        source_id: input.sourceId ?? null,
        type: input.type,
        title: input.title,
        message: input.message,
        priority,
        action_url: input.actionUrl ?? null,
        action_type: input.actionType ?? null,
        metadata: input.metadata ?? {},
      })
      .select()
      .single();

    if (error) {
      // 23505 = duplicate (source_id, type): reminder already sent. Not an
      // error from the caller's perspective.
      if (error.code === "23505") return null;
      console.error(
        JSON.stringify({
          scope: "notification",
          event: "create_failed",
          business_id: input.businessId,
          type: input.type,
          error_message: error.message,
          timestamp: new Date().toISOString(),
        }),
      );
      void logSystemEvent({
        scope: "notifications",
        event: `create failed (${input.type})`,
        level: "error",
        meta: { type: input.type, error: error.message.slice(0, 300) },
        businessId: input.businessId,
      });
      return null;
    }

    return data as Notification;
  } catch (e) {
    console.error(
      JSON.stringify({
        scope: "notification",
        event: "create_threw",
        business_id: input.businessId,
        type: input.type,
        error_message: e instanceof Error ? e.message : String(e),
        timestamp: new Date().toISOString(),
      }),
    );
    return null;
  }
}
