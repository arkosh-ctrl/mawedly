import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GULF_OFFSET_MINUTES } from "@/lib/booking/availability";
import { createNotification } from "@/lib/notifications/create";
import { logSystemEvent } from "@/lib/admin/log-event";
import type { NotificationType } from "@/lib/notifications/types";

// Scheduled every 5 minutes (see vercel.json). Reminders are idempotent per
// (appointment, type) via the DB unique index, so each type fires exactly once
// as the appointment first crosses its threshold — the 5-minute cadence just
// bounds the delay, it never duplicates.
//
// Times: appointment_date + start_time are Gulf wall-clock (Asia/Riyadh, fixed
// UTC+3, no DST), matching the rest of the app. We convert each to an absolute
// instant and compare against now.

export const dynamic = "force-dynamic";

type ApptRow = {
  id: string;
  business_id: string;
  appointment_date: string;
  start_time: string;
  customers: { name: string } | null;
  businesses: { default_language: string | null } | null;
};

/** Absolute epoch ms for a Gulf-local date + time. */
function gulfInstantMs(date: string, time: string): number {
  const hhmm = time.slice(0, 5);
  return Date.parse(`${date}T${hhmm}:00Z`) - GULF_OFFSET_MINUTES * 60_000;
}

/** Gulf-local YYYY-MM-DD offset by `days` from today. */
function gulfDateOffset(days: number): string {
  const ms = Date.now() + GULF_OFFSET_MINUTES * 60_000 + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

function reminderCopy(
  type: NotificationType,
  lang: "ar" | "en",
  name: string,
  time: string,
): { title: string; message: string } {
  const hhmm = time.slice(0, 5);
  if (lang === "en") {
    const label =
      type === "reminder_1h"
        ? "in 1 hour"
        : type === "reminder_30m"
          ? "in 30 minutes"
          : "in 15 minutes";
    return {
      title: "⏰ Upcoming appointment",
      message: `Appointment with ${name} ${label} (${hhmm}).`,
    };
  }
  const label =
    type === "reminder_1h"
      ? "بعد ساعة"
      : type === "reminder_30m"
        ? "بعد ٣٠ دقيقة"
        : "بعد ١٥ دقيقة";
  return {
    title: "⏰ تذكير بموعد",
    message: `موعدك مع ${name} ${label} (${hhmm}).`,
  };
}

export async function GET(request: NextRequest) {
  // Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when the env
  // var is set. Reject anything else so the endpoint isn't publicly triggerable.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const now = Date.now();

  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, business_id, appointment_date, start_time, customers(name), businesses(default_language)",
    )
    .eq("status", "confirmed")
    .gte("appointment_date", gulfDateOffset(-1))
    .lte("appointment_date", gulfDateOffset(1))
    .returns<ApptRow[]>();

  if (error) {
    await logSystemEvent({
      scope: "cron_reminders",
      event: "reminder scan query failed",
      level: "error",
      meta: { error: error.message.slice(0, 300) },
    });
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  let created = 0;
  for (const appt of data ?? []) {
    const startMs = gulfInstantMs(appt.appointment_date, appt.start_time);
    const minsUntil = (startMs - now) / 60_000;
    const lang: "ar" | "en" =
      appt.businesses?.default_language === "en" ? "en" : "ar";
    const name = appt.customers?.name ?? (lang === "en" ? "a customer" : "عميل");
    const actionUrl = `/${lang}/dashboard/appointments`;

    // Upcoming reminders. Each fires once (idempotency index) at first crossing.
    const dueReminders: NotificationType[] = [];
    if (minsUntil > 0 && minsUntil <= 60) dueReminders.push("reminder_1h");
    if (minsUntil > 0 && minsUntil <= 30) dueReminders.push("reminder_30m");
    if (minsUntil > 0 && minsUntil <= 15) dueReminders.push("reminder_15m");

    for (const type of dueReminders) {
      const { title, message } = reminderCopy(type, lang, name, appt.start_time);
      const res = await createNotification(supabase, {
        businessId: appt.business_id,
        type,
        title,
        message,
        priority: type === "reminder_15m" ? "urgent" : "high",
        sourceType: "appointment",
        sourceId: appt.id,
        actionUrl,
        actionType: "navigate",
      });
      if (res) created++;
    }

    // No-show detector: started ≥10 min ago (and not ancient) but still confirmed.
    if (minsUntil <= -10 && minsUntil > -180) {
      const res = await createNotification(supabase, {
        businessId: appt.business_id,
        type: "no_show",
        title: lang === "en" ? "⚠️ Possible no-show" : "⚠️ عدم حضور محتمل",
        message:
          lang === "en"
            ? `10 minutes past ${name}'s appointment (${appt.start_time.slice(0, 5)}) with no update.`
            : `مرّت ١٠ دقائق على موعد ${name} (${appt.start_time.slice(0, 5)}) دون تحديث.`,
        priority: "high",
        sourceType: "appointment",
        sourceId: appt.id,
        actionUrl,
        actionType: "navigate",
      });
      if (res) created++;
    }
  }

  // Housekeeping: the public booking rate-limit log only needs the last 10
  // minutes; 24h keeps a short forensic tail and nothing more. This rides the
  // existing daily cron on purpose — Vercel Hobby allows one schedule.
  // Fully best-effort: a failed prune changes neither the reminders nor the
  // response.
  let attemptsPruned = 0;
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: pruned, error: pruneError } = await supabase
      .from("booking_attempts")
      .delete()
      .lt("created_at", cutoff)
      .select("id");
    if (pruneError) {
      await logSystemEvent({
        scope: "cron_reminders",
        event: "booking_attempts prune failed",
        level: "warn",
        meta: { error: pruneError.message.slice(0, 300) },
      });
    } else {
      attemptsPruned = pruned?.length ?? 0;
    }
  } catch (e) {
    await logSystemEvent({
      scope: "cron_reminders",
      event: "booking_attempts prune failed",
      level: "warn",
      meta: { error: (e instanceof Error ? e.message : String(e)).slice(0, 300) },
    });
  }

  // Heartbeat: lets the admin health monitor confirm the cron actually ran.
  await logSystemEvent({
    scope: "cron_reminders",
    event: "reminder scan completed",
    level: "info",
    meta: {
      scanned: data?.length ?? 0,
      created,
      booking_attempts_pruned: attemptsPruned,
    },
  });

  return NextResponse.json({ ok: true, scanned: data?.length ?? 0, created });
}
