import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withAdmin } from "./db";
import type { AdminRole, AdminSession } from "./types";

/**
 * Strict server-side gate for /admin. Resolves the signed-in user, then checks
 * platform-admin membership via the service-role client (bypasses RLS, so no
 * policy recursion). Non-admins are redirected to their normal dashboard.
 *
 * `locale` drives the localized redirect target.
 */
export async function requireAdmin(locale: string): Promise<AdminSession> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) redirect(`/${locale}/login`);

  const admin = withAdmin(createAdminClient());
  const { data: record } = await admin
    .from("admins")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!record) redirect(`/${locale}/dashboard`);

  return { userId, role: record.role as AdminRole };
}
