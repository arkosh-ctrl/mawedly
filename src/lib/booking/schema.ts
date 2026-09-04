import { z } from "zod";

// A YYYY-MM-DD string the regex accepts but the calendar does not — "2026-13-45"
// or "2026-02-30" — must never reach the database. Round-trip the parts through
// Date and require them to survive unchanged.
//
// Deliberately clock-independent: no "today", no horizon. The 365-day upper
// bound lives in the API route, so this module stays deterministic under test.
function isRealCalendarDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

// Authoritative validation for the public booking endpoint. Field-level
// messages are not surfaced to the customer individually; the API returns a
// single "invalidInput" key, so plain (untranslated) messages are fine here.
export const bookingSchema = z.object({
  slug: z.string().trim().min(1).max(40),
  serviceId: z.string().uuid(),
  providerId: z.string().uuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(isRealCalendarDate, "date is not a real calendar date"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().regex(/^[0-9+\s-]{8,20}$/),
  customerEmail: z
    .union([z.literal(""), z.string().trim().email()])
    .optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;
