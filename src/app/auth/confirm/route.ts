import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

// Locale-agnostic auth callback. Handles both flows:
//   - PKCE (default magic-link email): a `code` is exchanged for a session.
//   - token_hash (customized email template): an OTP is verified.
// Excluded from the i18n middleware matcher so no locale prefix is added.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  const redirectTo =
    next && next.startsWith("/") ? next : `/${routing.defaultLocale}/dashboard`;

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(redirectTo, origin));
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(redirectTo, origin));
    }
  }

  // Verification failed or required params were missing.
  const loginUrl = new URL(`/${routing.defaultLocale}/login`, origin);
  loginUrl.searchParams.set("error", "auth");
  return NextResponse.redirect(loginUrl);
}
