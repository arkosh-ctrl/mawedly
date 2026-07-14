import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveBusinessId } from "@/lib/contacts/queries";
import { parseCsv } from "@/lib/contacts/csv";

export const dynamic = "force-dynamic";

const MAX_ROWS = 1000;

// Header aliases → canonical field (English + Arabic).
const ALIASES: Record<string, string> = {
  name: "name",
  "الاسم": "name",
  email: "email",
  "الإيميل": "email",
  "البريد": "email",
  "البريد الإلكتروني": "email",
  phone: "phone",
  "الجوال": "phone",
  "الهاتف": "phone",
  "job title": "job_title",
  jobtitle: "job_title",
  "المسمى الوظيفي": "job_title",
  "الوظيفة": "job_title",
  company: "company",
  "الشركة": "company",
  city: "city",
  "المدينة": "city",
  country: "country",
  "الدولة": "country",
  linkedin: "linkedin_url",
  "linkedin url": "linkedin_url",
  notes: "notes",
  "ملاحظات": "notes",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/contacts/import  body: { csv: string, strategy: "skip" | "update" }
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const businessId = await resolveBusinessId(supabase);
  if (!businessId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: { csv?: string; strategy?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalidBody" }, { status: 400 });
  }
  const strategy = payload.strategy === "update" ? "update" : "skip";
  const rows = parseCsv(payload.csv ?? "");
  if (rows.length < 2) {
    return NextResponse.json({ error: "emptyFile" }, { status: 400 });
  }
  if (rows.length - 1 > MAX_ROWS) {
    return NextResponse.json({ error: "tooManyRows" }, { status: 400 });
  }

  // Map header columns to canonical fields.
  const header = rows[0].map((h) => ALIASES[h.trim().toLowerCase()] ?? null);
  if (!header.includes("name")) {
    return NextResponse.json({ error: "missingNameColumn" }, { status: 400 });
  }

  // Existing contacts for dedupe (by email, then phone).
  const { data: existing } = await supabase
    .from("customers")
    .select("id, email, phone")
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .returns<{ id: string; email: string | null; phone: string | null }[]>();
  const byEmail = new Map<string, string>();
  const byPhone = new Map<string, string>();
  for (const e of existing ?? []) {
    if (e.email) byEmail.set(e.email.toLowerCase(), e.id);
    if (e.phone) byPhone.set(e.phone, e.id);
  }

  type Fields = {
    name: string;
    email: string | null;
    phone: string | null;
    job_title: string | null;
    company: string | null;
    city: string | null;
    country: string | null;
    linkedin_url: string | null;
    notes: string | null;
  };
  const errors: { row: number; reason: string }[] = [];
  const inserts: (Fields & { business_id: string; source: string })[] = [];
  const updates: { id: string; patch: Fields }[] = [];
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const rec: Record<string, string> = {};
    header.forEach((field, idx) => {
      if (field) rec[field] = (cells[idx] ?? "").trim();
    });

    const name = rec.name?.trim();
    if (!name || name.length < 2) {
      errors.push({ row: i + 1, reason: "name" });
      continue;
    }
    const email = rec.email ? rec.email.toLowerCase() : "";
    if (email && !EMAIL_RE.test(email)) {
      errors.push({ row: i + 1, reason: "email" });
      continue;
    }
    const phone = rec.phone ? rec.phone.replace(/\s/g, "") : "";

    const dupId =
      (email && byEmail.get(email)) || (phone && byPhone.get(phone)) || null;

    const fields: Fields = {
      name,
      email: email || null,
      phone: phone || null,
      job_title: rec.job_title || null,
      company: rec.company || null,
      city: rec.city || null,
      country: rec.country || null,
      linkedin_url: rec.linkedin_url || null,
      notes: rec.notes || null,
    };

    if (dupId) {
      if (strategy === "update") updates.push({ id: dupId, patch: fields });
      else skipped++;
      continue;
    }
    inserts.push({ ...fields, business_id: businessId, source: "csv_import" });
    // Track within-file dupes so two identical rows don't both insert.
    if (email) byEmail.set(email, "pending");
    if (phone) byPhone.set(phone, "pending");
  }

  let imported = 0;
  let updated = 0;

  if (inserts.length > 0) {
    // Insert only rows whose dedupe key isn't "pending"-collided twice; the map
    // above already prevents duplicate keys within the batch by keeping the first.
    const { data, error } = await supabase
      .from("customers")
      .insert(inserts)
      .select("id");
    if (error) {
      return NextResponse.json({ error: "importFailed" }, { status: 500 });
    }
    imported = data?.length ?? 0;
  }

  for (const u of updates) {
    const { error } = await supabase
      .from("customers")
      .update(u.patch)
      .eq("id", u.id)
      .eq("business_id", businessId);
    if (!error) updated++;
  }

  return NextResponse.json({ imported, updated, skipped, errors });
}
