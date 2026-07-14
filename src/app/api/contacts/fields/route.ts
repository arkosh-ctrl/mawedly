import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveBusinessId, getCustomFields } from "@/lib/contacts/queries";

export const dynamic = "force-dynamic";

const TYPES = new Set(["text", "number", "date"]);

// GET /api/contacts/fields — custom field definitions for the business.
export async function GET() {
  const supabase = await createClient();
  const businessId = await resolveBusinessId(supabase);
  if (!businessId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ fields: await getCustomFields(supabase, businessId) });
}

// POST /api/contacts/fields  body: { name, type } — key derived from name.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const businessId = await resolveBusinessId(supabase);
  if (!businessId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { name?: string; type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalidBody" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  const type = TYPES.has(body.type ?? "") ? body.type! : "text";
  if (name.length < 1 || name.length > 40) {
    return NextResponse.json({ error: "validationFailed" }, { status: 400 });
  }
  // Stable key: slug of the name, else a random suffix if non-latin.
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const key = slug || `field_${Math.random().toString(36).slice(2, 8)}`;

  const { data, error } = await supabase
    .from("custom_field_definitions")
    .insert({ business_id: businessId, name, key, type })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "duplicate" }, { status: 409 });
    return NextResponse.json({ error: "saveFailed" }, { status: 500 });
  }
  return NextResponse.json({ id: data.id, key }, { status: 201 });
}
