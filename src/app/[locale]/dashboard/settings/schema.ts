import { z } from "zod";
import { isReservedSlug } from "@/lib/booking/reserved-slugs";
import { LICENSE_ISSUERS } from "@/lib/verification/professions";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Shared between the client form (inline validation) and the server action
// (authoritative validation). Error messages are translation keys under the
// "Settings" namespace, resolved in the form via next-intl.
export const settingsSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "errors.nameRequired")
      .max(100, "errors.nameLong"),
    // Free-text merchant intro shown under the business name on the public page
    // (e.g. "استشاري تغذية علاجية"). Optional; empty string clears it.
    tagline: z
      .string()
      .trim()
      .max(80, "errors.taglineLong")
      .optional()
      .or(z.literal("")),
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
    work_start: z.string().regex(HHMM, "errors.workTime"),
    work_end: z.string().regex(HHMM, "errors.workTime"),
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
    // Practitioner license (regulated professions only). Both optional; the
    // document image is handled as a file upload in the action, like the QR.
    license_number: z
      .string()
      .trim()
      .max(100, "errors.tooLong")
      .optional()
      .or(z.literal("")),
    license_issuer: z
      .union([z.literal(""), z.enum(LICENSE_ISSUERS)])
      .optional(),
  })
  .refine((d) => toMinutes(d.work_start) < toMinutes(d.work_end), {
    path: ["work_end"],
    message: "errors.workRange",
  })
  .refine((d) => !isReservedSlug(d.slug), {
    path: ["slug"],
    message: "errors.slugReserved",
  });

export type SettingsInput = z.infer<typeof settingsSchema>;
