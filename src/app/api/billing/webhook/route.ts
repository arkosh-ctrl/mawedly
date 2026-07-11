import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { planForVariantId } from "@/lib/billing/lemonsqueezy";

// POST /api/billing/webhook — Lemon Squeezy events.
// Security: HMAC-SHA256 of the RAW body against LEMONSQUEEZY_WEBHOOK_SECRET
// (X-Signature header); anything unsigned is rejected. Every accepted event
// is recorded in billing_webhook_events; the unique lemon_event_id makes
// redeliveries idempotent.
//
// Handled events:
//   subscription_created / subscription_updated  → set plan + billing state
//   subscription_cancelled                        → keep plan until period end
//   subscription_expired                          → back to free
//   subscription_payment_success                  → status active + renews_at
//   subscription_payment_failed                   → status past_due

type LemonWebhook = {
  meta?: {
    event_name?: string;
    webhook_id?: string;
    custom_data?: { business_id?: string };
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: {
      status?: string;
      customer_id?: number;
      variant_id?: number;
      renews_at?: string | null;
      ends_at?: string | null;
      subscription_id?: number;
    };
  };
};

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature");
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "invalidSignature" }, { status: 401 });
  }

  let event: LemonWebhook;
  try {
    event = JSON.parse(rawBody) as LemonWebhook;
  } catch {
    return NextResponse.json({ ok: false, error: "invalidPayload" }, { status: 400 });
  }

  const eventName = event.meta?.event_name ?? "unknown";
  // webhook_id is unique per delivery attempt of the same event in LS; fall
  // back to a stable composite so replays of the same logical event dedupe.
  const eventId =
    event.meta?.webhook_id ??
    `${eventName}:${event.data?.id ?? "?"}:${event.data?.attributes?.renews_at ?? ""}`;

  const admin = createAdminClient();

  // Resolve the business: checkout custom data first, subscription id second.
  const businessIdFromCustom = event.meta?.custom_data?.business_id ?? null;
  const subscriptionId = event.data?.id ?? null;
  let businessId = businessIdFromCustom;
  if (!businessId && subscriptionId) {
    const { data } = await admin
      .from("businesses")
      .select("id")
      .eq("lemon_subscription_id", subscriptionId)
      .maybeSingle();
    businessId = data?.id ?? null;
  }

  // Idempotency + audit: the unique index rejects replays.
  const { error: logError } = await admin.from("billing_webhook_events").insert({
    lemon_event_id: eventId,
    event_name: eventName,
    business_id: businessId,
    payload: JSON.parse(rawBody),
  });
  if (logError) {
    if (logError.code === "23505") {
      // Already processed this event — acknowledge so LS stops retrying.
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("[billing] webhook log failed", logError);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  try {
    if (businessId) {
      await applyEvent(admin, businessId, eventName, event);
    } else {
      console.error("[billing] webhook with no resolvable business", {
        eventName,
        subscriptionId,
      });
    }
    await admin
      .from("billing_webhook_events")
      .update({ processed: true })
      .eq("lemon_event_id", eventId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    await admin
      .from("billing_webhook_events")
      .update({ error: message })
      .eq("lemon_event_id", eventId);
    console.error("[billing] webhook processing failed", { eventName, message });
    // 500 → Lemon Squeezy retries; the log row above dedupes... it would be
    // rejected as duplicate, so clear it to allow the retry to re-process.
    await admin
      .from("billing_webhook_events")
      .delete()
      .eq("lemon_event_id", eventId);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

async function applyEvent(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
  eventName: string,
  event: LemonWebhook,
) {
  const attrs = event.data?.attributes ?? {};
  const subscriptionId = event.data?.id ?? null;
  const renewsAt = attrs.renews_at ?? attrs.ends_at ?? null;

  switch (eventName) {
    case "subscription_created":
    case "subscription_updated": {
      const plan = attrs.variant_id
        ? planForVariantId(String(attrs.variant_id))
        : null;
      const status = mapStatus(attrs.status);
      const nextPlan =
        status === "expired" ? "free" : (plan ?? undefined);
      await admin
        .from("businesses")
        .update({
          lemon_subscription_id: subscriptionId,
          lemon_customer_id: attrs.customer_id
            ? String(attrs.customer_id)
            : null,
          subscription_status: status,
          subscription_renews_at: renewsAt,
          ...(nextPlan ? { plan: nextPlan } : {}),
        })
        .eq("id", businessId);
      break;
    }
    case "subscription_cancelled": {
      // Stays on the paid plan until the period ends (ends_at).
      await admin
        .from("businesses")
        .update({
          subscription_status: "cancelled",
          subscription_renews_at: attrs.ends_at ?? renewsAt,
        })
        .eq("id", businessId);
      break;
    }
    case "subscription_expired": {
      await admin
        .from("businesses")
        .update({
          plan: "free",
          subscription_status: "expired",
          subscription_renews_at: null,
        })
        .eq("id", businessId);
      break;
    }
    case "subscription_payment_success": {
      await admin
        .from("businesses")
        .update({ subscription_status: "active" })
        .eq("id", businessId);
      break;
    }
    case "subscription_payment_failed": {
      await admin
        .from("businesses")
        .update({ subscription_status: "past_due" })
        .eq("id", businessId);
      break;
    }
    default:
      // Unhandled event types are logged (row already written) and ignored.
      break;
  }
}

function mapStatus(lsStatus: string | undefined): string {
  switch (lsStatus) {
    case "active":
    case "on_trial":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "cancelled":
      return "cancelled";
    case "expired":
      return "expired";
    default:
      return "active";
  }
}
