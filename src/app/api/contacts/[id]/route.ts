import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { contactSchema } from "@/lib/contacts/schema";
import { resolveBusinessId } from "@/lib/contacts/queries";

export const dynamic = "force-dynamic";

// PATCH /api/contacts/[id] — update a contact (partial via full-object form).
export async function PATCH(
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

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validationFailed", detail: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const v = parsed.data;
  const phone = v.phone ? v.phone.replace(/\s/g, "") : null;

  const { data, error } = await supabase
    .from("customers")
    .update({
      name: v.name,
      email: v.email || null,
      phone,
      job_title: v.job_title || null,
      company: v.company || null,
      linkedin_url: v.linkedin_url || null,
      timezone: v.timezone || null,
      country: v.country || null,
      city: v.city || null,
      notes: v.notes || null,
      is_favorite: v.is_favorite ?? false,
    })
    .eq("id", id)
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .select("id");

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "duplicate" }, { status: 409 });
    }
    return NextResponse.json({ error: "saveFailed" }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/contacts/[id] — soft delete (sets deleted_at). Linked appointments
// keep their customer_id; the contact simply disappears from the list.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const businessId = await resolveBusinessId(supabase);
  if (!businessId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("customers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .select("id");

  if (error) return NextResponse.json({ error: "saveFailed" }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
