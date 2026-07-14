import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveBusinessId, getSentEmails } from "@/lib/contacts/queries";

export const dynamic = "force-dynamic";

// GET /api/contacts/[id]/sent-emails — emails this merchant sent to the contact.
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
  const emails = await getSentEmails(supabase, businessId, id);
  return NextResponse.json({ emails });
}
