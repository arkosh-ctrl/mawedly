import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveBusinessId, getLists } from "@/lib/contacts/queries";

export const dynamic = "force-dynamic";

// GET /api/contacts/lists — all lists for the business.
export async function GET() {
  const supabase = await createClient();
  const businessId = await resolveBusinessId(supabase);
  if (!businessId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ lists: await getLists(supabase, businessId) });
}

// POST /api/contacts/lists  body: { name, color? } — create a list.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const businessId = await resolveBusinessId(supabase);
  if (!businessId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { name?: string; color?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalidBody" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (name.length < 1 || name.length > 60) {
    return NextResponse.json({ error: "validationFailed" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("contact_lists")
    .insert({ business_id: businessId, name, color: body.color || "#3B82F6" })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "saveFailed" }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
