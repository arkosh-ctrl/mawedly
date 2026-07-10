import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

// 1080×1080 share card for one review — Cal-Apple identity (white card on
// neutral canvas, one blue, soft green stars badge). PRIVACY BY DESIGN: the
// customer's name is never rendered; only rating + comment + business name.
//
// Auth: merchant session only, and the review must belong to the caller's own
// business — the card URL is not a public capability. The merchant downloads
// or Web-Shares the produced PNG; shared LINKS point at the public booking
// page instead.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Satori has no bidi algorithm: it lays out space-separated words LTR, which
// reverses Arabic word order. Workaround: join each visual LINE with NBSP so
// the whole line is a single shaping run (correct RTL inside a run), and do
// the line wrapping ourselves by a character budget.
function rtlRun(s: string) {
  return s.replace(/ /g, " ");
}

function wrapRtlLines(text: string, charsPerLine: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (candidate.length > charsPerLine && line) {
      lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.map(rtlRun);
}

// IBM Plex Sans Arabic fetched at runtime (module-cached). Satori needs raw
// font data and has no system-font fallback; runtime fetch keeps the repo
// font-file-free and works both on localhost and Vercel.
const FONT_CSS_URL =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;700&display=swap";

let fontsPromise: Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> | null =
  null;

async function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      const css = await fetch(FONT_CSS_URL, {
        // A UA that receives ttf/woff (not woff2 — satori can't parse woff2).
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
      }).then((r) => r.text());
      const urls = [...css.matchAll(/src: url\((https:[^)]+\.ttf)\)/g)].map(
        (m) => m[1],
      );
      if (urls.length < 2) throw new Error("font css parse failed");
      // css2 lists weights in request order: 400 first, then 700.
      const [regular, bold] = await Promise.all(
        urls.slice(0, 2).map((u) => fetch(u).then((r) => r.arrayBuffer())),
      );
      return { regular, bold };
    })();
    // A failed fetch shouldn't poison the cache forever.
    fontsPromise.catch(() => {
      fontsPromise = null;
    });
  }
  return fontsPromise;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  try {
    const { reviewId } = await params;
    if (!UUID_RE.test(reviewId)) {
      return new Response("Bad request", { status: 400 });
    }

    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const [{ data: business }, { data: review }] = await Promise.all([
      supabase
        .from("businesses")
        .select("id, name, slug")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("reviews")
        .select("id, business_id, rating, comment")
        .eq("id", reviewId)
        .maybeSingle(),
    ]);
    if (!business || !review || review.business_id !== business.id) {
      return new Response("Not found", { status: 404 });
    }

    const fonts = await loadFonts();
    const comment = (review.comment ?? "").trim();
    const quote =
      comment.length > 180 ? `${comment.slice(0, 180)}…` : comment;
    const quoteLines = quote
      ? wrapRtlLines(`”${quote}“`, quote.length > 110 ? 40 : 30)
      : [rtlRun("تقييم خمس نجوم من عملائنا")];
    const bookingUrl = `mawedly.com/ar/${business.slug}`;

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f5f5f7",
            fontFamily: "Plex",
            padding: 64,
            // Satori doesn't infer bidi: without an explicit RTL direction the
            // Arabic words render in reversed order.
            direction: "rtl",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              height: "100%",
              backgroundColor: "#ffffff",
              borderRadius: 48,
              border: "1px solid #e5e7eb",
              boxShadow: "0 24px 48px rgba(0,0,0,0.08)",
              padding: "72px 80px",
              textAlign: "center",
            }}
          >
            {/* Brand */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                color: "#006bff",
                fontSize: 40,
                fontWeight: 700,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  backgroundColor: "#006bff",
                }}
              />
              موعدلي
            </div>

            {/* Stars — drawn as SVG: the ★ glyph isn't in IBM Plex and would
                render as tofu boxes. */}
            <div style={{ display: "flex", gap: 12 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <svg
                  key={i}
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill={i <= review.rating ? "#f59e0b" : "#e5e7eb"}
                >
                  <path d="m12 2.5 2.9 6 6.6.9-4.8 4.5 1.2 6.5L12 17.3l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9 2.9-6Z" />
                </svg>
              ))}
            </div>

            {/* Quote — manual RTL line wrapping (see wrapRtlLines). */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                fontSize: quote.length > 110 ? 44 : 54,
                fontWeight: 700,
                color: "#111827",
                lineHeight: 1.5,
                maxWidth: 860,
              }}
            >
              {quoteLines.map((line, i) => (
                <div key={i} style={{ display: "flex" }}>
                  {line}
                </div>
              ))}
            </div>

            {/* Attribution — anonymised by design */}
            <div style={{ display: "flex", fontSize: 30, color: "#6b7280" }}>
              {rtlRun("رأي عميل موثّق عبر موعدلي")}
            </div>

            {/* Business + CTA */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
              }}
            >
              <div style={{ fontSize: 44, fontWeight: 700, color: "#111827" }}>
                {rtlRun(business.name)}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  backgroundColor: "#006bff",
                  color: "#ffffff",
                  fontSize: 32,
                  fontWeight: 700,
                  padding: "20px 44px",
                  borderRadius: 999,
                }}
              >
                {/* Two runs (Arabic + latin URL); root direction:rtl puts the
                    Arabic span on the right. */}
                <span>{rtlRun("احجز موعدك —")}</span>
                <span>{bookingUrl}</span>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1080,
        fonts: [
          { name: "Plex", data: fonts.regular, weight: 400, style: "normal" },
          { name: "Plex", data: fonts.bold, weight: 700, style: "normal" },
        ],
        headers: {
          // Merchant-session gated AND uncached: generation is cheap once the
          // fonts are module-cached, and a stale cached card (old design /
          // edited review) is worse than a 200ms regeneration.
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (err) {
    console.error("[share-card] generation failed", err);
    return new Response("Card generation failed", { status: 500 });
  }
}
