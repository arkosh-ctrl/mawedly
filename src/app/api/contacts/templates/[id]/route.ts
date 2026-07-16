import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveBusinessId } from "@/lib/contacts/queries";

export const dynamic = "force-dynamic";

// DELETE /api/contacts/templates/[id] — remove a saved template.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const businessId = await resolveBusinessId(supabase);
  if (!businessId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("email_templates")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId)
    .select("id");
  if (error) return NextResponse.json({ error: "saveFailed" }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "notFound" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
