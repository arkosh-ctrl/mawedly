"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";
import {
  requiresLicense,
  initialVerificationStatus,
} from "@/lib/verification/professions";
import { signupSchema } from "./schema";
import type { SignupState } from "./types";

// Server action: create a merchant account (Supabase Auth user) AND its
// `businesses` row in one logical step, then sign the merchant straight in.
//
// Atomicity across two systems: the auth user is created by GoTrue while the
// business is a separate table insert — they cannot share one SQL transaction,
// and project policy forbids new migrations/DB functions. So atomicity is
// achieved with a COMPENSATING ACTION: if the business insert fails after the
// user is created, the just-created user is deleted, leaving no silent
// "user without a business".
//
// Two clients, by design:
//   - admin (service_role): create the user without an email-confirmation
//     round-trip (email_confirm:true) and delete it on rollback — auth-admin
//     APIs the public client can't call.
//   - session (SSR) client: the `businesses` INSERT. Table grants exist only for
//     `authenticated`/`anon` (migration 0003), NOT service_role — so the row is
//     inserted under the merchant's own session (auth.uid() = user_id passes the
//     owner RLS policy), exactly as dashboard/settings does. This is why we sign
//     the user in BEFORE inserting.
//
// Final safety net (belt and suspenders): even if the compensating delete were
// to fail, dashboard/page.tsx already detects "no business" and routes the
// merchant to /dashboard/settings to complete setup — they are never stuck.
export async function signupAction(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  let redirectTo: string | null = null;

  try {
    const parsed = signupSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      name: formData.get("name"),
      slug: formData.get("slug"),
      type: formData.get("type"),
      phone: formData.get("phone"),
      license_number: formData.get("license_number") ?? "",
      license_issuer: formData.get("license_issuer") ?? "",
      license_attestation: formData.get("license_attestation") === "on",
    });
    if (!parsed.success) {
      const key = parsed.error.issues[0]?.message ?? "messages.signupFailed";
      return {
        status: "error",
        messageKey: key.replace(
          "messages.",
          "",
        ) as SignupState["messageKey"],
      };
    }
    const v = parsed.data;

    // Normalize phone to digits and length-check it exactly as
    // dashboard/settings/actions.ts does.
    const phone = v.phone.replace(/\D/g, "");
    if (phone.length < 10 || phone.length > 15) {
      return { status: "error", messageKey: "phone" };
    }

    const locale = await getLocale();
    const admin = createAdminClient();

    // 1) Create the auth user. email_confirm:true => no confirmation email; the
    //    account is usable immediately (project decision: no email verification).
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email: v.email,
        password: v.password,
        email_confirm: true,
      });
    if (createError || !created?.user) {
      // Most common case: the email already has an account.
      return { status: "error", messageKey: "emailTaken" };
    }
    const userId = created.user.id;

    // 2) Establish the session via the SSR client (sets cookies on this
    //    response). Done BEFORE the insert so the row can be created under the
    //    merchant's own session — the only role granted INSERT on businesses.
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: v.email,
      password: v.password,
    });
    if (signInError) {
      // Couldn't sign in the brand-new account — roll it back so no orphan user
      // remains, then surface a generic failure.
      await admin.auth.admin.deleteUser(userId);
      return { status: "error", messageKey: "signupFailed" };
    }

    // 3) Insert the business row under the merchant's session (authenticated
    //    role + owner RLS). On any failure, compensate: sign out (clear the
    //    cookie just set) and delete the orphaned user — never a user without a
    //    business.
    // Regulated professions start in "pending" review; everyone else is
    // "not_required". A license number/issuer captured now is stored so the
    // manual review has something to check; the document image is uploaded later
    // from settings.
    const needsLicense = requiresLicense(v.type);
    const { error: insertError } = await supabase.from("businesses").insert({
      user_id: userId,
      name: v.name,
      slug: v.slug,
      type: v.type,
      phone,
      default_language: locale === "en" ? "en" : "ar",
      requires_license: needsLicense,
      verification_status: initialVerificationStatus(v.type),
      license_number: needsLicense ? v.license_number || null : null,
      license_issuer: needsLicense ? v.license_issuer || null : null,
    });
    if (insertError) {
      await supabase.auth.signOut();
      await admin.auth.admin.deleteUser(userId);
      // Unique violation on slug (e.g. a race after the live check) => slugTaken.
      if (insertError.code === "23505") {
        return { status: "error", messageKey: "slugTaken" };
      }
      return { status: "error", messageKey: "signupFailed" };
    }

    redirectTo =
      safeNextPath(String(formData.get("next") ?? "")) ??
      `/${locale}/dashboard`;
  } catch {
    return { status: "error", messageKey: "signupFailed" };
  }

  // redirect() throws internally, so it must run outside the try/catch.
  redirect(redirectTo);
}
