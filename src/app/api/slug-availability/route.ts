import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isReservedSlug } from "@/lib/booking/reserved-slugs";

// Live slug-availability check for the signup form (debounced per keystroke).
// Reuses the SAME sources of truth as everywhere else: the slug format regex
// (dashboard/settings/schema.ts), isReservedSlug (lib/booking/reserved-slugs),
// and the businesses table. The admin client is used so the check sees rows
// regardless of is_active / RLS; only a boolean + reason is returned, never any
// business data — and a slug's availability is inherently public anyway (it is
// the public booking URL).
const SLUG_RE = /^[a-z0-9-]+$/;

export async function GET(request: NextRequest) {
  const slug = (request.nextUrl.searchParams.get("slug") ?? "")
    .trim()
    .toLowerCase();

  if (slug.length < 3 || slug.length > 40 || !SLUG_RE.test(slug)) {
    return NextResponse.json({ available: false, reason: "invalid" });
  }
  if (isReservedSlug(slug)) {
    return NextResponse.json({ available: false, reason: "reserved" });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      // Don't claim availability we couldn't verify; the unique constraint is
      // still the final authority at insert time.
      return NextResponse.json({ available: false, reason: "error" });
    }

    return data
      ? NextResponse.json({ available: false, reason: "taken" })
      : NextResponse.json({ available: true, reason: "ok" });
  } catch {
    return NextResponse.json({ available: false, reason: "error" });
  }
}
