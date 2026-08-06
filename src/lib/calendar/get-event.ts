import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/seo/site";
import type { CalendarEvent } from "./ics";

type Row = {
  appointment_date: string;
  start_time: string;
  services: {
    name: string;
    duration_minutes: number;
    session_type: string | null;
  } | null;
  businesses: {
    name: string;
    notification_email: string | null;
    default_language: string | null;
  } | null;
  customers: { name: string; email: string | null } | null;
};

/**
 * Build a calendar event for an appointment. Capability model: possession of the
 * (unguessable) appointment id is the credential — the same access model as
 * chat / consultation / review — so this reads via the service-role client.
 * Returns null when the appointment doesn't exist.
 */
export async function getCalendarEvent(
  appointmentId: string,
): Promise<CalendarEvent | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "appointment_date, start_time, services(name, duration_minutes, session_type), businesses(name, notification_email, default_language), customers(name, email)",
    )
    .eq("id", appointmentId)
    .maybeSingle<Row>();

  if (error || !data || !data.services || !data.businesses) return null;

  const lang = data.businesses.default_language === "en" ? "en" : "ar";
  const serviceName = data.services.name;
  const businessName = data.businesses.name;
  const isVirtual = data.services.session_type === "virtual";
  // SITE_URL, not a local fallback: the apex 308s to www, and this URL is
  // baked into a calendar invite that outlives the redirect being cheap.
  const appUrl = SITE_URL;
  const consultationUrl = `${appUrl}/${lang}/consultation/${appointmentId}`;

  const title =
    lang === "en"
      ? `${serviceName} · ${businessName}`
      : `${serviceName} · ${businessName}`;

  const location = isVirtual
    ? consultationUrl
    : businessName;

  const descLines =
    lang === "en"
      ? [
          `${serviceName} with ${businessName}`,
          `Duration: ${data.services.duration_minutes} minutes`,
          ...(isVirtual
            ? ["", `Video room: ${consultationUrl}`]
            : []),
          "",
          "— Mawedly",
        ]
      : [
          `${serviceName} لدى ${businessName}`,
          `المدة: ${data.services.duration_minutes} دقيقة`,
          ...(isVirtual ? ["", `غرفة الاستشارة المرئية: ${consultationUrl}`] : []),
          "",
          "— موعدلي",
        ];

  return {
    appointmentId,
    title,
    description: descLines.join("\n"),
    location,
    date: data.appointment_date,
    startTime: data.start_time.slice(0, 5),
    durationMinutes: data.services.duration_minutes || 30,
    organizerName: businessName,
    organizerEmail: data.businesses.notification_email || "no-reply@mawedly.com",
    attendeeName: data.customers?.name || (lang === "en" ? "Customer" : "العميل"),
    attendeeEmail: data.customers?.email ?? undefined,
  };
}
