import { z } from "zod";

// Shared between the client form (inline validation) and the server action
// (authoritative validation). Error messages are translation keys under the
// "Settings" namespace, resolved in the form via next-intl.
export const settingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "errors.nameRequired")
    .max(100, "errors.nameLong"),
  slug: z
    .string()
    .trim()
    .min(3, "errors.slugShort")
    .max(40, "errors.slugLong")
    .regex(/^[a-z0-9-]+$/, "errors.slugFormat"),
  // Loose client check; normalized to digits and length-checked on the server.
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s-]{8,20}$/, "errors.phone"),
  notification_email: z
    .union([z.literal(""), z.string().trim().email("errors.email")])
    .optional(),
  default_language: z.enum(["ar", "en"]),
  bank_name: z.string().trim().max(100, "errors.tooLong").optional().or(z.literal("")),
  bank_iban: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .regex(/^[A-Za-z]{2}[0-9]{2}[A-Za-z0-9]{10,30}$/, "errors.iban"),
    ])
    .optional(),
  bank_account_name: z
    .string()
    .trim()
    .max(100, "errors.tooLong")
    .optional()
    .or(z.literal("")),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
