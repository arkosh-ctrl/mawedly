import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emailSchema } from "@/lib/contacts/schema";
import { resolveBusinessId } from "@/lib/contacts/queries";
import { sendDirectEmail } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

const HOUR_MS = 60 * 60 * 1000;
const MIN_MS = 60 * 1000;
const MAX_PER_HOUR = 50;
const MAX_PER_CONTACT_PER_MIN = 5;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// POST /api/contacts/[id]/send-email — merchant sends a one-off email to a
// contact via Resend. Rate-limited using the sent_emails log.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const businessId = await resolveBusinessId(supabase);
  if (!businessId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalidBody" }, { status: 400 });
  }
  const parsed = emailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validationFailed", detail: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const { subject, body: message } = parsed.data;

  // Contact must belong to this business and have an email.
  const { data: contact } = await supabase
    .from("customers")
    .select("id, name, email")
    .eq("id", id)
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!contact) return NextResponse.json({ error: "notFound" }, { status: 404 });
  if (!contact.email) {
    return NextResponse.json({ error: "noEmail" }, { status: 400 });
  }

  // Rate limits from the sent_emails log.
  const nowMs = Date.now();
  const { count: hourCount } = await supabase
    .from("sent_emails")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .gte("sent_at", new Date(nowMs - HOUR_MS).toISOString());
  if ((hourCount ?? 0) >= MAX_PER_HOUR) {
    return NextResponse.json({ error: "rateLimitHour" }, { status: 429 });
  }
  const { count: minCount } = await supabase
    .from("sent_emails")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("customer_id", id)
    .gte("sent_at", new Date(nowMs - MIN_MS).toISOString());
  if ((minCount ?? 0) >= MAX_PER_CONTACT_PER_MIN) {
    return NextResponse.json({ error: "rateLimitContact" }, { status: 429 });
  }

  // Business context for reply-to + footer link.
  const { data: business } = await supabase
    .from("businesses")
    .select("name, slug, notification_email")
    .eq("id", businessId)
    .maybeSingle();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.mawedly.com";
  const bookingUrl = business?.slug ? `${appUrl}/${business.slug}` : appUrl;
  const footerText = `\n\n—\nأُرسلت عبر موعدلي\n${bookingUrl}`;
  const html = `<div style="font-family:sans-serif;line-height:1.6;white-space:pre-wrap">${escapeHtml(
    message,
  )}</div><hr/><p style="color:#888;font-size:12px">أُرسلت عبر موعدلي · <a href="${bookingUrl}">${
    business?.name ?? "Mawedly"
  }</a></p>`;

  const result = await sendDirectEmail({
    to: contact.email,
    subject: `[موعدلي] ${subject}`,
    html,
    text: message + footerText,
    replyTo: business?.notification_email ?? undefined,
  });

  // Log the attempt (best-effort).
  await supabase.from("sent_emails").insert({
    business_id: businessId,
    customer_id: id,
    to_email: contact.email,
    subject,
    body: message,
    status: result.ok ? "sent" : "failed",
    resend_message_id: result.id ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "sendFailed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
