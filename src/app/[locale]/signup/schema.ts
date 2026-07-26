import { z } from "zod";
import { isReservedSlug } from "@/lib/booking/reserved-slugs";
import { PROFESSION_TYPES, LICENSE_ISSUERS } from "@/lib/verification/professions";

// Authoritative server-side validation for merchant signup. Error messages are
// translation keys under the "Signup.messages" namespace (resolved by the form
// via next-intl), matching the project's existing schema pattern (see
// login/schema.ts and dashboard/settings/schema.ts). The slug and phone rules
// are kept identical to dashboard/settings/schema.ts so a row created here
// passes the same constraints the settings screen later enforces.

// The `businesses.type` column is free text with no DB enum/CHECK (see
// supabase/migrations/0001_init_schema_v3_2.sql:23). The authoritative list of
// what a NEW signup may choose — and which of those require a professional
// license — lives in src/lib/verification/professions.ts (single source of
// truth). Legacy values ("consulting") remain valid in existing rows.
export { PROFESSION_TYPES as BUSINESS_TYPES };

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("messages.invalidEmail"),
  // 8-char minimum agreed for this project (matches login/schema.ts). Supabase
  // enforces its own minimum server-side as defense in depth.
  // At least 8 chars, and must include a letter (any case) AND a digit.
  password: z
    .string()
    .min(8, "messages.passwordShort")
    .regex(/[A-Za-z]/, "messages.passwordWeak")
    .regex(/[0-9]/, "messages.passwordWeak"),
  name: z
    .string()
    .trim()
    .min(2, "messages.nameRequired")
    .max(100, "messages.nameLong"),
  slug: z
    .string()
    .trim()
    .min(3, "messages.slugShort")
    .max(40, "messages.slugLong")
    .regex(/^[a-z0-9-]+$/, "messages.slugFormat")
    .refine((s) => !isReservedSlug(s), "messages.slugReserved"),
  type: z.enum(PROFESSION_TYPES),
  // Loose client check; normalized to digits and length-checked in the action,
  // exactly as dashboard/settings/schema.ts + actions.ts do.
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s-]{8,20}$/, "messages.phone"),
  // License fields — captured at signup for regulated professions. All optional
  // (verification is recommended, not mandatory); the action decides the initial
  // verification_status from the chosen type. The document image is uploaded
  // separately from the settings screen (proven QR-upload path).
  license_number: z
    .string()
    .trim()
    .max(100, "messages.licenseLong")
    .optional()
    .or(z.literal("")),
  license_issuer: z
    .union([z.literal(""), z.enum(LICENSE_ISSUERS)])
    .optional(),
  // Checkbox comes through FormData as "on" when ticked, absent otherwise.
  license_attestation: z.boolean().optional(),
  // Explicit, mandatory consent to Terms + Privacy + Disclaimer.
  terms_consent: z.literal(true, {
    errorMap: () => ({ message: "messages.consentRequired" }),
  }),
  // Optional consent to booking notifications/reminders.
  marketing_consent: z.boolean().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
