import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Chat attachment upload (image or PDF). Two callers, same detection as
// sendMessage (lib/chat/actions.ts): a merchant session uploads via the
// authenticated client — the "owner manages chat attachments" storage policy
// (migration 0012) scopes the write to their own business folder; an
// anonymous customer uploads via service_role after the appointment id + open
// status are verified server-side (capability URL — no anon storage policy
// exists at all). Mirrors api/deposit/route.ts, with a 10MB limit (vs. 5MB)
// and one extra allowed type (GIF). Unlike deposit, the response returns the
// path/metadata directly: the caller (ChatInputArea) needs it immediately to
// call sendMessage — there's no single fixed column to write it into here.

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

// Statuses in which the chat thread is open for writing. MUST mirror
// CHAT_OPEN_STATUSES in lib/chat/actions.ts and the trigger in migration 0012.
const CHAT_OPEN_STATUSES = ["pending_verification", "confirmed"];

// Keeps the original name (so the chat UI can show it) while stripping
// anything unsafe for a storage object key.
function sanitizeFileName(name: string): string {
  const trimmed = name.trim().slice(-100);
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
}

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalidInput" }, { status: 400 });
  }

  const appointmentId = String(form.get("appointmentId") ?? "");
  const file = form.get("file");
  if (!appointmentId || !(file instanceof File)) {
    return NextResponse.json({ error: "invalidInput" }, { status: 400 });
  }

  // Validate the file BEFORE any storage work.
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "invalidType" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "tooLarge" }, { status: 400 });
  }

  const session = await createClient();
  const { data: claims } = await session.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;

  let businessId: string;

  if (userId) {
    // Merchant path — ownership enforced explicitly, and the upload runs on
    // the authenticated client so the storage RLS policy scopes it to their
    // own business folder.
    const { data: business } = await session
      .from("businesses")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!business) {
      return NextResponse.json({ error: "noBusiness" }, { status: 403 });
    }

    const { data: appt } = await session
      .from("appointments")
      .select("id, status")
      .eq("id", appointmentId)
      .eq("business_id", business.id)
      .maybeSingle();
    if (!appt) {
      return NextResponse.json({ error: "notFound" }, { status: 404 });
    }
    if (!CHAT_OPEN_STATUSES.includes(appt.status)) {
      return NextResponse.json({ error: "chatClosed" }, { status: 409 });
    }
    businessId = business.id;

    const path = `${businessId}/${appointmentId}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await session.storage
      .from("chat-attachments")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      console.error(
        JSON.stringify({
          scope: "chat",
          event: "upload_failed",
          booking_id: appointmentId,
          error_message: uploadError.message,
          timestamp: new Date().toISOString(),
        }),
      );
      return NextResponse.json({ error: "saveFailed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      path,
      mimeType: file.type,
      fileName: file.name,
      fileSize: file.size,
    });
  }

  // Customer path — anonymous. Possession of the appointment id is the
  // credential; verify it and the open status before any storage write.
  const admin = createAdminClient();
  const { data: appt } = await admin
    .from("appointments")
    .select("id, business_id, status")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }
  if (!CHAT_OPEN_STATUSES.includes(appt.status)) {
    return NextResponse.json({ error: "chatClosed" }, { status: 409 });
  }

  const path = `${appt.business_id}/${appointmentId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await admin.storage
    .from("chat-attachments")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error(
      JSON.stringify({
        scope: "chat",
        event: "upload_failed",
        booking_id: appointmentId,
        error_message: uploadError.message,
        timestamp: new Date().toISOString(),
      }),
    );
    return NextResponse.json({ error: "saveFailed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    path,
    mimeType: file.type,
    fileName: file.name,
    fileSize: file.size,
  });
}
