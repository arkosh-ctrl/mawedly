"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";
import { passwordSignInSchema, resetRequestSchema } from "./schema";
import type { LoginState } from "./types";

// Basic email shape check; full validation (react-hook-form + zod) arrives with
// the settings screen in a later step.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Server action: send a passwordless Magic Link to the given email.
export async function signInWithMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  try {
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const next = String(formData.get("next") ?? "");

    if (!EMAIL_RE.test(email)) {
      return { status: "error", messageKey: "invalidEmail" };
    }

    const requestHeaders = await headers();
    const origin =
      requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    const safeNext = safeNextPath(next);
    const emailRedirectTo = `${origin}/auth/confirm${
      safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""
    }`;

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo, shouldCreateUser: true },
    });

    if (error) {
      return { status: "error", messageKey: "sendFailed" };
    }

    return { status: "success", messageKey: "checkEmail" };
  } catch {
    return { status: "error", messageKey: "sendFailed" };
  }
}

// Server action: sign in with email + password. On success the session cookies
// are set and we redirect to the requested internal path. Supabase returns a
// single generic "Invalid login credentials" error for both a wrong password
// and an account that has no password yet (a legacy magic-link merchant), so
// the error message guides the user toward the password-reset / set-password
// flow without leaking which case occurred.
export async function signInWithPassword(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  let safeNext: string | null = null;
  try {
    const parsed = passwordSignInSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) {
      const key = parsed.error.issues[0]?.message;
      return {
        status: "error",
        messageKey:
          key === "messages.passwordShort" ? "passwordShort" : "invalidEmail",
      };
    }

    safeNext = safeNextPath(String(formData.get("next") ?? ""));

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      return { status: "error", messageKey: "invalidCredentials" };
    }
  } catch {
    return { status: "error", messageKey: "invalidCredentials" };
  }

  // redirect() throws internally, so it must run outside the try/catch.
  // safeNext is already a locale-prefixed internal path when present.
  const locale = await getLocale();
  redirect(safeNext ?? `/${locale}/dashboard`);
}

// Server action: send a Supabase password-reset email. This is the single
// mechanism behind both "forgot password" and "set a password for the first
// time" (legacy magic-link merchants); only the surrounding UI text differs.
// Always returns a generic success to avoid leaking whether an account exists.
export async function requestPasswordReset(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  try {
    const parsed = resetRequestSchema.safeParse({
      email: formData.get("email"),
    });
    if (!parsed.success) {
      return { status: "error", messageKey: "invalidEmail" };
    }

    const requestHeaders = await headers();
    const origin =
      requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    const locale = await getLocale();
    const redirectTo = `${origin}/auth/confirm?next=${encodeURIComponent(
      `/${locale}/update-password`,
    )}`;

    const supabase = await createClient();
    // Ignore the result: a generic success is returned regardless to prevent
    // account enumeration.
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo,
    });

    return { status: "success", messageKey: "resetEmailSent" };
  } catch {
    // Same generic success on unexpected failure — never reveal account state.
    return { status: "success", messageKey: "resetEmailSent" };
  }
}
