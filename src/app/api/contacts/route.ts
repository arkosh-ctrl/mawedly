import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { contactSchema } from "@/lib/contacts/schema";
import { resolveBusinessId, listContacts } from "@/lib/contacts/queries";

export const dynamic = "force-dynamic";

// GET /api/contacts?search=&favorite= — list the merchant's contacts.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const businessId = await resolveBusinessId(supabase);
  if (!businessId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  const favorite = req.nextUrl.searchParams.get("favorite") === "true";
  const listId = req.nextUrl.searchParams.get("list_id") ?? undefined;
  const contacts = await listContacts(supabase, businessId, { search, favorite, listId });
  return NextResponse.json({ contacts });
}

// POST /api/contacts — create a contact manually.
export async function POST(req: NextRequest) {
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
    .insert({
      business_id: businessId,
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
      custom_fields: v.custom_fields ?? {},
      source: "manual",
    })
    .select("id")
    .single();

  if (error) {
    // Unique (business_id, phone) violation → duplicate phone.
    if (error.code === "23505") {
      return NextResponse.json({ error: "duplicate" }, { status: 409 });
    }
    return NextResponse.json({ error: "saveFailed" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
