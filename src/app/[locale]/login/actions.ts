"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";
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
