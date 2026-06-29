import { z } from "zod";

// Authoritative server-side validation for the password sign-in and password
// reset request actions. Error messages are translation keys under the "Login"
// namespace (resolved by the forms via next-intl), matching the project's
// existing schema pattern (see dashboard/settings/schema.ts).

export const passwordSignInSchema = z.object({
  email: z.string().trim().toLowerCase().email("messages.invalidEmail"),
  // 8-char minimum agreed for this project. Supabase enforces its own minimum
  // server-side as defense in depth.
  password: z.string().min(8, "messages.passwordShort"),
});

export const resetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("messages.invalidEmail"),
});

export type PasswordSignInInput = z.infer<typeof passwordSignInSchema>;
export type ResetRequestInput = z.infer<typeof resetRequestSchema>;
