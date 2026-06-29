"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";
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
// "user without a business". The service_role admin client is required both to
// create the user without an email-confirmation round-trip (email_confirm:true)
// and to delete it on rollback — the public client can do neither.
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

    // 2) Insert the business row. On any failure, compensate by deleting the
    //    orphaned user so we never leave a user without a business.
    const { error: insertError } = await admin.from("businesses").insert({
      user_id: userId,
      name: v.name,
      slug: v.slug,
      type: v.type,
      phone,
      default_language: locale === "en" ? "en" : "ar",
    });
    if (insertError) {
      await admin.auth.admin.deleteUser(userId);
      // Unique violation on slug (e.g. a race after the live check) => slugTaken.
      if (insertError.code === "23505") {
        return { status: "error", messageKey: "slugTaken" };
      }
      return { status: "error", messageKey: "signupFailed" };
    }

    // 3) Establish the session via the SSR client so cookies are set on this
    //    response, then redirect into the dashboard.
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: v.email,
      password: v.password,
    });
    if (signInError) {
      // Account + business both exist; the merchant can simply sign in.
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
