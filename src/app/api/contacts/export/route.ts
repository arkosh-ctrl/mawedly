import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveBusinessId, listContacts } from "@/lib/contacts/queries";
import { toCsv } from "@/lib/contacts/csv";

export const dynamic = "force-dynamic";

const HEADERS = [
  "Name",
  "Email",
  "Phone",
  "Job title",
  "Company",
  "City",
  "Country",
  "LinkedIn",
  "Notes",
  "Source",
  "Created",
];

// GET /api/contacts/export?ids=a,b,c — CSV download (all, or a selected subset).
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const businessId = await resolveBusinessId(supabase);
  if (!businessId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const idsParam = req.nextUrl.searchParams.get("ids");
  const ids = idsParam ? new Set(idsParam.split(",").filter(Boolean)) : null;

  let contacts = await listContacts(supabase, businessId);
  if (ids) contacts = contacts.filter((c) => ids.has(c.id));

  const rows = contacts.map((c) => [
    c.name,
    c.email ?? "",
    c.phone ?? "",
    c.job_title ?? "",
    c.company ?? "",
    c.city ?? "",
    c.country ?? "",
    c.linkedin_url ?? "",
    c.notes ?? "",
    c.source,
    c.created_at?.slice(0, 10) ?? "",
  ]);

  const csv = toCsv(HEADERS, rows);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mawedly-contacts-${date}.csv"`,
    },
  });
}
