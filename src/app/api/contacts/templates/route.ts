import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveBusinessId } from "@/lib/contacts/queries";

export const dynamic = "force-dynamic";

// GET /api/contacts/templates — the merchant's saved email templates.
export async function GET() {
  const supabase = await createClient();
  const businessId = await resolveBusinessId(supabase);
  if (!businessId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data } = await supabase
    .from("email_templates")
    .select("id, name, subject, body")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });
  return NextResponse.json({ templates: data ?? [] });
}

// POST /api/contacts/templates  body: { name, subject, body } — save a template.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const businessId = await resolveBusinessId(supabase);
  if (!businessId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let b: { name?: string; subject?: string; body?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "invalidBody" }, { status: 400 });
  }
  const name = (b.name ?? "").trim();
  const subject = (b.subject ?? "").trim();
  const body = (b.body ?? "").trim();
  if (!name || name.length > 80 || !subject || subject.length > 200 || !body || body.length > 5000) {
    return NextResponse.json({ error: "validationFailed" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("email_templates")
    .insert({ business_id: businessId, name, subject, body })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "saveFailed" }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
