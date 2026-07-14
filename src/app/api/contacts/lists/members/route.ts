import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveBusinessId } from "@/lib/contacts/queries";

export const dynamic = "force-dynamic";

// Verify the list belongs to the merchant's business (RLS also enforces this).
async function ownsList(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  listId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("contact_lists")
    .select("id")
    .eq("id", listId)
    .eq("business_id", businessId)
    .maybeSingle();
  return !!data;
}

// POST /api/contacts/lists/members  body: { listId, contactIds: string[] } — add.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const businessId = await resolveBusinessId(supabase);
  if (!businessId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { listId?: string; contactIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalidBody" }, { status: 400 });
  }
  const listId = body.listId;
  const contactIds = Array.isArray(body.contactIds) ? body.contactIds.slice(0, 1000) : [];
  if (!listId || contactIds.length === 0) {
    return NextResponse.json({ error: "validationFailed" }, { status: 400 });
  }
  if (!(await ownsList(supabase, businessId, listId))) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  const { error } = await supabase
    .from("contact_list_members")
    .upsert(
      contactIds.map((contact_id) => ({ contact_id, list_id: listId })),
      { onConflict: "contact_id,list_id", ignoreDuplicates: true },
    );
  if (error) return NextResponse.json({ error: "saveFailed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/contacts/lists/members  body: { listId, contactId } — remove one.
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const businessId = await resolveBusinessId(supabase);
  if (!businessId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { listId?: string; contactId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalidBody" }, { status: 400 });
  }
  if (!body.listId || !body.contactId) {
    return NextResponse.json({ error: "validationFailed" }, { status: 400 });
  }
  if (!(await ownsList(supabase, businessId, body.listId))) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }
  const { error } = await supabase
    .from("contact_list_members")
    .delete()
    .eq("list_id", body.listId)
    .eq("contact_id", body.contactId);
  if (error) return NextResponse.json({ error: "saveFailed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
