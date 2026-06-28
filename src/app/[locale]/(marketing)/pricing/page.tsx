import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pricing" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pricing");

  const plans = [
    {
      name: t("starterName"),
      price: "49",
      tagline: t("starterTagline"),
      features: [t("starterF1"), t("starterF2"), t("starterF3"), t("starterF4")],
      cta: t("starterCta"),
      featured: false,
    },
    {
      name: t("proName"),
      price: "99",
      tagline: t("proTagline"),
      features: [t("proF1"), t("proF2"), t("proF3"), t("proF4")],
      cta: t("proCta"),
      featured: true,
    },
    {
      name: t("bizName"),
      price: "199",
      tagline: t("bizTagline"),
      features: [t("bizF1"), t("bizF2"), t("bizF3"), t("bizF4")],
      cta: t("bizCta"),
      featured: false,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-20">
      <header>
        <span className="eyebrow">{t("subtitle")}</span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {t("title")}
        </h1>
      </header>

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`relative flex flex-col rounded-3xl border p-8 ${
              p.featured
                ? "border-ink bg-ink text-paper shadow-xl shadow-ink/10"
                : "border-line bg-paper"
            }`}
          >
            {p.featured && (
              <span className="absolute -top-3 start-8 rounded-full bg-saffron px-3 py-1 text-xs font-semibold text-ink">
                {t("mostPopular")}
              </span>
            )}
            <h2
              className={`font-display text-lg font-bold ${p.featured ? "text-paper" : "text-ink"}`}
            >
              {p.name}
            </h2>
            <p className={`mt-1 text-sm ${p.featured ? "text-sage" : "text-muted"}`}>
              {p.tagline}
            </p>
            <div className="mt-5 flex items-baseline gap-1.5" dir="ltr">
              <span
                className={`font-mono text-4xl font-semibold ${p.featured ? "text-saffron-soft" : "text-ink"}`}
              >
                {p.price}
              </span>
              <span className={`text-sm ${p.featured ? "text-sage" : "text-muted"}`}>
                {t("currency")}
              </span>
              <span className={`text-sm ${p.featured ? "text-sage" : "text-muted"}`}>
                {t("perMonth")}
              </span>
            </div>
            <ul className="mt-7 flex flex-1 flex-col gap-3">
              {p.features.map((f) => (
                <li
                  key={f}
                  className={`flex items-start gap-2.5 text-sm ${p.featured ? "text-paper/90" : "text-pine"}`}
                >
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-saffron" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className={`mt-8 rounded-full px-6 py-3 text-center text-sm font-semibold transition-colors ${
                p.featured
                  ? "bg-saffron text-ink hover:bg-saffron-soft"
                  : "border border-line bg-canvas text-ink hover:border-ink"
              }`}
            >
              {p.cta}
            </Link>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-muted">
        {t("assumptionNote")}
      </p>
    </div>
  );
}
