"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { updatePasswordSchema } from "./schema";
import type { UpdatePasswordState } from "./types";

// Server action: set the signed-in user's password. Reached only with an
// active recovery session established via the reset email (auth/confirm). On
// success the merchant is redirected to the dashboard. Same mechanism for a
// first-time password (legacy merchant) and a forgotten-password reset.
export async function updatePassword(
  _prev: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  try {
    const parsed = updatePasswordSchema.safeParse({
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) {
      const key = parsed.error.issues[0]?.message;
      return {
        status: "error",
        messageKey:
          key === "messages.passwordMismatch"
            ? "passwordMismatch"
            : "passwordShort",
      };
    }

    const supabase = await createClient();
    // Require an active session (the recovery session from the reset link).
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return { status: "error", messageKey: "sessionExpired" };
    }

    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (error) {
      return { status: "error", messageKey: "updateFailed" };
    }
  } catch {
    return { status: "error", messageKey: "updateFailed" };
  }

  // redirect() throws internally, so it must run outside the try/catch.
  const locale = await getLocale();
  redirect(`/${locale}/dashboard`);
}
