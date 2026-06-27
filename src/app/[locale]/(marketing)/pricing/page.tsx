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
    <div className="mx-auto max-w-6xl px-5 py-16">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-600">
          {t("subtitle")}
        </p>
      </header>

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`relative flex flex-col rounded-3xl border p-8 ${
              p.featured
                ? "border-emerald-300 bg-emerald-50/50 shadow-sm"
                : "border-neutral-200 bg-white"
            }`}
          >
            {p.featured && (
              <span className="absolute -top-3 start-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                {t("mostPopular")}
              </span>
            )}
            <h2 className="text-lg font-semibold text-neutral-900">{p.name}</h2>
            <p className="mt-1 text-sm text-neutral-500">{p.tagline}</p>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="text-4xl font-bold text-neutral-900">
                {p.price}
              </span>
              <span className="text-sm text-neutral-500">{t("currency")}</span>
              <span className="text-sm text-neutral-500">{t("perMonth")}</span>
            </div>
            <ul className="mt-7 flex flex-1 flex-col gap-3">
              {p.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm text-neutral-700"
                >
                  <span className="mt-0.5 text-emerald-600" aria-hidden>
                    ✓
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className={`mt-8 rounded-full px-6 py-3 text-center text-sm font-semibold transition-opacity hover:opacity-90 ${
                p.featured
                  ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
                  : "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
              }`}
            >
              {p.cta}
            </Link>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-neutral-500">
        {t("assumptionNote")}
      </p>
    </div>
  );
}
