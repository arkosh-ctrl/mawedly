import { z } from "zod";
import { isReservedSlug } from "@/lib/booking/reserved-slugs";

// Authoritative server-side validation for merchant signup. Error messages are
// translation keys under the "Signup.messages" namespace (resolved by the form
// via next-intl), matching the project's existing schema pattern (see
// login/schema.ts and dashboard/settings/schema.ts). The slug and phone rules
// are kept identical to dashboard/settings/schema.ts so a row created here
// passes the same constraints the settings screen later enforces.

// The `businesses.type` column is free text with no DB enum/CHECK (see
// supabase/migrations/0001_init_schema_v3_2.sql:23), so this list is the
// source of truth for what NEW signups may choose: the five consultation
// fields of the platform pivot, plus a catch-all. Legacy values written under
// the old positioning ("salon", "consulting") remain valid in existing rows —
// settings never edits type, and display code maps every known value.
export const BUSINESS_TYPES = [
  "education",
  "business",
  "nutrition",
  "legal",
  "mental_health",
  "other",
] as const;

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("messages.invalidEmail"),
  // 8-char minimum agreed for this project (matches login/schema.ts). Supabase
  // enforces its own minimum server-side as defense in depth.
  password: z.string().min(8, "messages.passwordShort"),
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
  type: z.enum(BUSINESS_TYPES),
  // Loose client check; normalized to digits and length-checked in the action,
  // exactly as dashboard/settings/schema.ts + actions.ts do.
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s-]{8,20}$/, "messages.phone"),
});

export type SignupInput = z.infer<typeof signupSchema>;
