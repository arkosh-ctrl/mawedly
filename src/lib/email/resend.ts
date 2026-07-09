import "server-only";

import { Resend } from "resend";
import { logSystemEvent } from "@/lib/admin/log-event";

// Sender on the verified mawedly.com domain.
const FROM = "Mawedly <support@mawedly.com>";

let client: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

type EmailAttachment = {
  filename: string;
  // Raw file content (e.g. an .ics string). Resend accepts a string or Buffer.
  content: string;
  contentType?: string;
};

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  // Plain-text alternative. Sending multipart (text + html) improves
  // deliverability vs. HTML-only.
  text?: string;
  attachments?: EmailAttachment[];
  // Context for structured failure logs (not sent in the email).
  context?: { booking_id?: string | null; business_id?: string | null };
};

function logFailure(event: string, args: SendArgs, errorMessage: string) {
  console.error(
    JSON.stringify({
      scope: "email",
      event,
      booking_id: args.context?.booking_id ?? null,
      business_id: args.context?.business_id ?? null,
      error_message: errorMessage,
      timestamp: new Date().toISOString(),
    }),
  );
  // Mirror into the admin health monitor (refs only, no raw PII).
  void logSystemEvent({
    scope: "email",
    event,
    level: event === "skipped_no_api_key" ? "warn" : "error",
    meta: {
      booking_id: args.context?.booking_id ?? null,
      error: errorMessage.slice(0, 300),
    },
    businessId: args.context?.business_id ?? null,
  });
}

// Best-effort email send. NEVER throws — a failed email must not break the
// booking/confirmation flow. Failures are logged with structured context.
export async function sendEmail(args: SendArgs): Promise<void> {
  try {
    const resend = getClient();
    if (!resend) {
      logFailure("skipped_no_api_key", args, "RESEND_API_KEY is not set");
      return;
    }
    const { error } = await resend.emails.send({
      from: FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      ...(args.text ? { text: args.text } : {}),
      ...(args.attachments && args.attachments.length > 0
        ? {
            attachments: args.attachments.map((a) => ({
              filename: a.filename,
              content: a.content,
              ...(a.contentType ? { contentType: a.contentType } : {}),
            })),
          }
        : {}),
    });
    if (error) {
      logFailure("send_failed", args, error.message ?? String(error));
    }
  } catch (e) {
    logFailure("send_exception", args, e instanceof Error ? e.message : String(e));
  }
}
