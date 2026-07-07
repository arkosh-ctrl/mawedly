// Pure calendar builders — no dependencies, no server-only (usable from a route,
// a server action, or an email template). Times are Gulf wall-clock
// (Asia/Riyadh, fixed UTC+3, no DST): we build the local time string directly
// from appointment_date + start_time, so there's no server-timezone drift.

export type CalendarEvent = {
  appointmentId: string;
  title: string;
  description: string;
  location: string;
  date: string; // YYYY-MM-DD (Gulf)
  startTime: string; // HH:MM (Gulf)
  durationMinutes: number;
  organizerName: string;
  organizerEmail: string;
  attendeeName: string;
  attendeeEmail?: string | null;
};

const GULF_OFFSET_MS = 3 * 60 * 60 * 1000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Wall-clock components of (date + startTime + minutes), no timezone applied. */
function wallClock(date: string, startTime: string, addMinutes: number) {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = startTime.slice(0, 5).split(":").map(Number);
  // Use UTC arithmetic purely to add minutes and roll over dates/hours; the
  // result is read back as plain wall-clock components (never as an instant).
  const ms = Date.UTC(y, mo - 1, d, h, mi) + addMinutes * 60_000;
  const dt = new Date(ms);
  return (
    dt.getUTCFullYear().toString() +
    pad(dt.getUTCMonth() + 1) +
    pad(dt.getUTCDate()) +
    "T" +
    pad(dt.getUTCHours()) +
    pad(dt.getUTCMinutes()) +
    "00"
  );
}

/** Basic UTC stamp (YYYYMMDDTHHMMSSZ) for a real instant. */
function utcStamp(ms: number): string {
  const dt = new Date(ms);
  return (
    dt.getUTCFullYear().toString() +
    pad(dt.getUTCMonth() + 1) +
    pad(dt.getUTCDate()) +
    "T" +
    pad(dt.getUTCHours()) +
    pad(dt.getUTCMinutes()) +
    pad(dt.getUTCSeconds()) +
    "Z"
  );
}

function esc(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** RFC 5545 VEVENT with an Asia/Riyadh VTIMEZONE and a 30-minute alarm. */
export function buildIcs(event: CalendarEvent): string {
  const dtStart = wallClock(event.date, event.startTime, 0);
  const dtEnd = wallClock(event.date, event.startTime, event.durationMinutes);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mawedly//Appointment//AR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Riyadh",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0300",
    "TZOFFSETTO:+0300",
    "TZNAME:+03",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:mawedly-${event.appointmentId}@mawedly.com`,
    `DTSTAMP:${utcStamp(Date.now())}`,
    `DTSTART;TZID=Asia/Riyadh:${dtStart}`,
    `DTEND;TZID=Asia/Riyadh:${dtEnd}`,
    `SUMMARY:${esc(event.title)}`,
    `DESCRIPTION:${esc(event.description)}`,
    `LOCATION:${esc(event.location)}`,
    `ORGANIZER;CN=${esc(event.organizerName)}:mailto:${event.organizerEmail}`,
  ];

  if (event.attendeeEmail) {
    lines.push(
      `ATTENDEE;CN=${esc(event.attendeeName)};ROLE=REQ-PARTICIPANT:mailto:${event.attendeeEmail}`,
    );
  }

  lines.push(
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(event.title)}`,
    "TRIGGER:-PT30M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  );

  // CRLF line endings per spec.
  return lines.join("\r\n") + "\r\n";
}

/** Google Calendar "add event" URL. Dates are the true UTC instants. */
export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const [y, mo, d] = event.date.split("-").map(Number);
  const [h, mi] = event.startTime.slice(0, 5).split(":").map(Number);
  const startMs = Date.UTC(y, mo - 1, d, h, mi) - GULF_OFFSET_MS;
  const endMs = startMs + event.durationMinutes * 60_000;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${utcStamp(startMs)}/${utcStamp(endMs)}`,
    details: event.description,
    location: event.location,
    ctz: "Asia/Riyadh",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
