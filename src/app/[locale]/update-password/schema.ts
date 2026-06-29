import { z } from "zod";

// Authoritative server-side validation for setting a new password. Used by
// both legacy merchants setting a password for the first time and existing
// merchants resetting a forgotten one — identical mechanism. Error messages
// are translation keys under the "UpdatePassword.messages" namespace.
export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "messages.passwordShort"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "messages.passwordMismatch",
  });

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
