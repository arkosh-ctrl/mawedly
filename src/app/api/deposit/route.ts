import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { INITIAL_APPOINTMENT_STATUS } from "@/lib/appointments/status";

// Customer deposit-receipt upload. The customer is anonymous, so this route runs
// with the service_role client (bypasses storage + table RLS). Objects are stored
// under `deposits/{business_id}/...` so the merchant (owner) can later read them
// through the existing owner-only storage policy via a signed URL.

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Allowed receipt types: bank-app screenshots (images) + exported PDFs.
const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

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

  // Validate file BEFORE any storage work.
  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json({ error: "invalidType" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "tooLarge" }, { status: 400 });
  }

  // The appointment must exist, be still awaiting verification, and not already
  // have a verified deposit. This narrows what a leaked appointment id allows.
  const { data: appt } = await supabase
    .from("appointments")
    .select("id, business_id, status, deposit_verified, deposit_screenshot_path")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }
  if (appt.status !== INITIAL_APPOINTMENT_STATUS || appt.deposit_verified) {
    return NextResponse.json({ error: "notAllowed" }, { status: 409 });
  }

  const path = `${appt.business_id}/${appt.id}-${Date.now()}.${ext}`;

  // Safe replace order: upload the new object, point the row at it, then delete
  // the previous object. A failure mid-way never leaves the row pointing at a
  // missing file.
  const { error: uploadError } = await supabase.storage
    .from("deposits")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error(
      JSON.stringify({
        scope: "deposit",
        event: "upload_failed",
        booking_id: appt.id,
        error_message: uploadError.message,
        timestamp: new Date().toISOString(),
      }),
    );
    return NextResponse.json({ error: "saveFailed" }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("appointments")
    .update({ deposit_screenshot_path: path })
    .eq("id", appt.id);
  if (updateError) {
    // Roll back the orphaned object so storage doesn't accumulate junk.
    await supabase.storage.from("deposits").remove([path]);
    console.error(
      JSON.stringify({
        scope: "deposit",
        event: "update_failed",
        booking_id: appt.id,
        error_message: updateError.message,
        timestamp: new Date().toISOString(),
      }),
    );
    return NextResponse.json({ error: "saveFailed" }, { status: 500 });
  }

  if (appt.deposit_screenshot_path) {
    await supabase.storage
      .from("deposits")
      .remove([appt.deposit_screenshot_path]);
  }

  return NextResponse.json({ ok: true });
}
