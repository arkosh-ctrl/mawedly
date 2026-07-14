import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveBusinessId, getContactMeetings } from "@/lib/contacts/queries";

export const dynamic = "force-dynamic";

// GET /api/contacts/[id]/meetings — this contact's appointment history.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const businessId = await resolveBusinessId(supabase);
  if (!businessId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const meetings = await getContactMeetings(supabase, businessId, id);
  return NextResponse.json({ meetings });
}
