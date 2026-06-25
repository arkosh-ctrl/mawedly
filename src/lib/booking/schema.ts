import { z } from "zod";

// Authoritative validation for the public booking endpoint. Field-level
// messages are not surfaced to the customer individually; the API returns a
// single "invalidInput" key, so plain (untranslated) messages are fine here.
export const bookingSchema = z.object({
  slug: z.string().trim().min(1).max(40),
  serviceId: z.string().uuid(),
  providerId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().regex(/^[0-9+\s-]{8,20}$/),
  customerEmail: z
    .union([z.literal(""), z.string().trim().email()])
    .optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;
