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
      comment.length > 220 ? `${comment.slice(0, 220)}…` : comment;
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

            {/* Stars */}
            <div
              style={{
                display: "flex",
                fontSize: 72,
                color: "#f59e0b",
                letterSpacing: 6,
              }}
            >
              {"★".repeat(review.rating)}
              <span style={{ color: "#e5e7eb" }}>
                {"★".repeat(5 - review.rating)}
              </span>
            </div>

            {/* Quote */}
            <div
              style={{
                display: "flex",
                fontSize: quote.length > 120 ? 44 : 54,
                fontWeight: 700,
                color: "#111827",
                lineHeight: 1.5,
                maxWidth: 820,
              }}
            >
              {quote ? `”${quote}“` : "تقييم 5 نجوم من عميل"}
            </div>

            {/* Attribution — anonymised by design */}
            <div style={{ display: "flex", fontSize: 30, color: "#6b7280" }}>
              رأي عميل موثّق عبر موعدلي
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
                {business.name}
              </div>
              <div
                style={{
                  display: "flex",
                  backgroundColor: "#006bff",
                  color: "#ffffff",
                  fontSize: 32,
                  fontWeight: 700,
                  padding: "20px 44px",
                  borderRadius: 999,
                }}
              >
                {`احجز موعدك — ${bookingUrl}`}
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
          // Private: the card is merchant-session gated.
          "Cache-Control": "private, max-age=300",
        },
      },
    );
  } catch (err) {
    console.error("[share-card] generation failed", err);
    return new Response("Card generation failed", { status: 500 });
  }
}
