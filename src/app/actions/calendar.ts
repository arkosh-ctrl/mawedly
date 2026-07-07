"use server";

import { getCalendarEvent } from "@/lib/calendar/get-event";
import { buildGoogleCalendarUrl } from "@/lib/calendar/ics";

export type CalendarLinks = {
  icsUrl: string;
  googleUrl: string;
};

/**
 * Return the calendar links for an appointment. The ICS is served by the
 * capability route; the Google URL is built server-side from the event data.
 * Returns null if the appointment can't be resolved.
 */
export async function getCalendarLinks(
  appointmentId: string,
): Promise<CalendarLinks | null> {
  const event = await getCalendarEvent(appointmentId);
  if (!event) return null;
  return {
    icsUrl: `/api/calendar/${appointmentId}`,
    googleUrl: buildGoogleCalendarUrl(event),
  };
}
