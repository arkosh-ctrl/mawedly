import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCalendarEvent } from "@/lib/calendar/get-event";
import { buildIcs } from "@/lib/calendar/ics";

export const dynamic = "force-dynamic";

// Serves an .ics file for an appointment. Capability = possession of the
// (unguessable) appointment id — the same model as /chat and /consultation. The
// file only contains data the customer already has, and carries no secrets.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  const { appointmentId } = await params;

  const event = await getCalendarEvent(appointmentId);
  if (!event) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  // Best-effort tracking (columns from migration 0015). Never blocks the file.
  try {
    const admin = createAdminClient();
    await admin
      .from("appointments")
      .update({
        calendar_added: true,
        calendar_added_at: new Date().toISOString(),
      })
      .eq("id", appointmentId);
  } catch {
    // Columns may not exist yet during rollout — ignore.
  }

  const ics = buildIcs(event);
  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="mawedly-${appointmentId.slice(0, 8)}.ics"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
