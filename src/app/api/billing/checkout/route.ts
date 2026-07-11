import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createCheckout } from "@/lib/billing/lemonsqueezy";
import { isPlanId, PLANS } from "@/lib/billing/plans";

// POST /api/billing/checkout  { plan: "pro_49" | "center_99" | "enterprise_299" }
// → { url } — a hosted Lemon Squeezy checkout for the caller's own business.
// Auth: merchant session (the business is resolved from auth.uid, never from
// the request body).

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const plan = String(body?.plan ?? "");
    if (!isPlanId(plan) || plan === "free" || !PLANS[plan].lemonVariantEnv) {
      return NextResponse.json({ ok: false, error: "invalidPlan" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;
    const email = claims?.claims?.email as string | undefined;
    if (!userId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id, default_language")
      .eq("user_id", userId)
      .maybeSingle();
    if (!business) {
      return NextResponse.json({ ok: false, error: "noBusiness" }, { status: 400 });
    }

    const requestHeaders = await headers();
    const origin =
      requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    const lang = business.default_language === "en" ? "en" : "ar";

    const url = await createCheckout({
      plan,
      businessId: business.id,
      email: email ?? null,
      redirectUrl: `${origin}/${lang}/dashboard/billing?checkout=success`,
    });

    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("[billing] checkout failed", err);
    return NextResponse.json({ ok: false, error: "checkoutFailed" }, { status: 500 });
  }
}
