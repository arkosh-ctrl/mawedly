import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCustomerPortalUrl } from "@/lib/billing/lemonsqueezy";

// GET /api/billing/portal → { url } — signed Lemon Squeezy Customer Portal
// link for the caller's own subscription (cancel / change plan / invoices).

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id, lemon_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!business?.lemon_subscription_id) {
      return NextResponse.json({ ok: false, error: "noSubscription" }, { status: 400 });
    }

    const url = await getCustomerPortalUrl(business.lemon_subscription_id);
    if (!url) {
      return NextResponse.json({ ok: false, error: "portalFailed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("[billing] portal failed", err);
    return NextResponse.json({ ok: false, error: "portalFailed" }, { status: 500 });
  }
}
