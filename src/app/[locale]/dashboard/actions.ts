"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

// Server action: sign the merchant out and return them to the localized login.
export async function signOut(formData: FormData) {
  const requested = String(formData.get("locale") ?? routing.defaultLocale);
  const locale = routing.locales.includes(
    requested as (typeof routing.locales)[number],
  )
    ? requested
    : routing.defaultLocale;

  const supabase = await createClient();
  // Keep the redirect OUTSIDE try/catch — redirect() throws NEXT_REDIRECT by
  // design and must not be swallowed.
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore sign-out failures; we still send the user back to login.
  }

  redirect(`/${locale}/login`);
}
