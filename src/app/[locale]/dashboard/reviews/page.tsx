import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

type ReviewRow = {
  rating: number;
  comment: string | null;
  created_at: string;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span dir="ltr" className="text-saffron" aria-hidden>
      {"★".repeat(rating)}
      <span className="text-line">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export default async function ReviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Reviews");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub as string | undefined;

  // Scope to the owner's business. RLS already limits reviews to the owner, but
  // we filter by business_id explicitly as defense in depth (same pattern as the
  // dashboard home / settings pages).
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", userId ?? "")
    .maybeSingle();

  let reviews: ReviewRow[] = [];
  if (business) {
    const { data } = await supabase
      .from("reviews")
      .select("rating, comment, created_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .returns<ReviewRow[]>();
    reviews = data ?? [];
  }

  const count = reviews.length;
  const average =
    count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="eyebrow">{t("subtitle")}</span>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
          {t("title")}
        </h1>
      </div>

      {count === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-paper px-5 py-8 text-center text-sm text-muted">
          {t("empty")}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 rounded-2xl border border-line bg-paper px-4 py-4">
              <span className="font-mono text-3xl font-bold text-ink">
                {average.toFixed(1)}
              </span>
              <span className="text-xs text-muted">{t("averageLabel")}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl border border-line bg-paper px-4 py-4">
              <span className="font-mono text-3xl font-bold text-ink">
                {count}
              </span>
              <span className="text-xs text-muted">{t("countLabel")}</span>
            </div>
          </div>

          <ul className="flex flex-col gap-3">
            {reviews.map((r, i) => (
              <li
                key={i}
                className="flex flex-col gap-2 rounded-2xl border border-line bg-paper px-5 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <Stars rating={r.rating} />
                  <time className="font-mono text-xs text-muted" dir="ltr">
                    {r.created_at.slice(0, 10)}
                  </time>
                </div>
                {r.comment && (
                  <p className="text-sm text-ink">{r.comment}</p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
