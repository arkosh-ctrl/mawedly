import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { withAdmin } from "./db";
import type { SystemEventLevel, SystemEventScope } from "./types";

export type LogEventInput = {
  scope: SystemEventScope;
  event: string;
  level: SystemEventLevel;
  // Refs only (ids/codes) — NEVER raw PII (phone/email/name). PDPL.
  meta?: Record<string, unknown>;
  businessId?: string | null;
};

/**
 * Record a subsystem event for the /admin health monitor. Best-effort and
 * server-only: sits BESIDE existing console.error calls (never replaces them),
 * and a logging failure never affects the primary operation.
 */
export async function logSystemEvent(input: LogEventInput): Promise<void> {
  try {
    const admin = withAdmin(createAdminClient());
    await admin.from("system_events").insert({
      scope: input.scope,
      event: input.event,
      level: input.level,
      meta: input.meta ?? {},
      business_id: input.businessId ?? null,
    });
  } catch (e) {
    console.error(
      JSON.stringify({
        scope: "system",
        event: "system_event_log_failed",
        error_message: e instanceof Error ? e.message : String(e),
        timestamp: new Date().toISOString(),
      }),
    );
  }
}
