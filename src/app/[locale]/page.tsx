import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");

  // Organization structured data for the home page.
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Mawedly",
    alternateName: "موعدلي",
    url: "https://mawedly.com",
    description: t("metaDescription"),
    email: "hello@mawedly.com",
    areaServed: "GCC",
  };

  const features = [
    { title: t("feature1Title"), body: t("feature1Body"), icon: "🔒" },
    { title: t("feature2Title"), body: t("feature2Body"), icon: "⚡" },
    { title: t("feature3Title"), body: t("feature3Body"), icon: "💬" },
    { title: t("feature4Title"), body: t("feature4Body"), icon: "🌐" },
  ];

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-50 to-white" />
        <div className="relative mx-auto max-w-4xl px-5 py-20 text-center sm:py-28">
          <span className="inline-block rounded-full border border-emerald-200 bg-white px-4 py-1.5 text-xs font-medium text-emerald-700">
            {t("heroBadge")}
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-5xl md:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-neutral-600">
            {t("heroSubtitle")}
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="w-full rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 px-7 py-3 text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-90 sm:w-auto"
            >
              {t("heroCtaPrimary")}
            </Link>
            <Link
              href="/how-it-works"
              className="w-full rounded-full border border-neutral-300 bg-white px-7 py-3 text-base font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 sm:w-auto"
            >
              {t("heroCtaSecondary")}
            </Link>
          </div>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8">
            <h2 className="text-xl font-bold text-neutral-900">
              {t("problemTitle")}
            </h2>
            <p className="mt-4 leading-relaxed text-neutral-600">
              {t("problemBody")}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8">
            <h2 className="text-xl font-bold text-emerald-800">
              {t("solutionTitle")}
            </h2>
            <p className="mt-4 leading-relaxed text-neutral-700">
              {t("solutionBody")}
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-5 py-12">
        <h2 className="text-center text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          {t("featuresTitle")}
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-7 transition-shadow hover:shadow-sm"
            >
              <span className="text-2xl" aria-hidden>
                {f.icon}
              </span>
              <h3 className="text-lg font-semibold text-neutral-900">
                {f.title}
              </h3>
              <p className="leading-relaxed text-neutral-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 px-8 py-14 text-center text-white">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("finalCtaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-emerald-50">
            {t("finalCtaBody")}
          </p>
          <Link
            href="/login"
            className="mt-8 inline-block rounded-full bg-white px-8 py-3 text-base font-semibold text-emerald-700 shadow-sm transition-transform hover:scale-[1.02]"
          >
            {t("finalCtaButton")}
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
