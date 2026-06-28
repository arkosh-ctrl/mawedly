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
    { title: t("feature1Title"), body: t("feature1Body") },
    { title: t("feature2Title"), body: t("feature2Body") },
    { title: t("feature3Title"), body: t("feature3Body") },
    { title: t("feature4Title"), body: t("feature4Body") },
  ];

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />

      {/* Hero — headline as thesis, beside a live "daybook" of today's slots */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col items-start">
            <span className="eyebrow">{t("heroBadge")}</span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl md:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              {t("heroSubtitle")}
            </p>
            <div className="mt-9 flex w-full flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/login"
                className="rounded-full bg-ink px-7 py-3 text-center text-base font-semibold text-paper transition-colors hover:bg-pine"
              >
                {t("heroCtaPrimary")}
              </Link>
              <Link
                href="/how-it-works"
                className="rounded-full border border-line bg-paper px-7 py-3 text-center text-base font-semibold text-ink transition-colors hover:border-ink"
              >
                {t("heroCtaSecondary")}
              </Link>
            </div>
          </div>

          <Daybook
            eyebrow={t("demoEyebrow")}
            confirmed={t("demoConfirmed")}
            depositPaid={t("demoDepositPaid")}
            held={t("demoHeld")}
            open={t("demoOpen")}
          />
        </div>
      </section>

      {/* Problem / Solution — two ledger entries across the spread */}
      <section className="mx-auto max-w-5xl px-5 py-20">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2">
          <div className="bg-canvas p-8 sm:p-10">
            <span className="eyebrow text-muted">{t("problemTitle")}</span>
            <p className="mt-5 leading-relaxed text-pine">{t("problemBody")}</p>
          </div>
          <div className="bg-ink p-8 text-paper sm:p-10">
            <span className="eyebrow">{t("solutionTitle")}</span>
            <p className="mt-5 leading-relaxed text-sage">{t("solutionBody")}</p>
          </div>
        </div>
      </section>

      {/* Features — capabilities as ruled daybook entries */}
      <section className="mx-auto max-w-5xl px-5 pb-20">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {t("featuresTitle")}
        </h2>
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="flex flex-col gap-3 bg-paper p-8">
              <span
                className="size-2.5 rounded-[2px] bg-saffron"
                aria-hidden
              />
              <h3 className="font-display text-lg font-bold text-ink">
                {f.title}
              </h3>
              <p className="leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="rounded-3xl bg-ink px-8 py-16 text-center text-paper">
          <h2 className="mx-auto max-w-2xl font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t("finalCtaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-sage">
            {t("finalCtaBody")}
          </p>
          <Link
            href="/login"
            className="mt-9 inline-block rounded-full bg-saffron px-8 py-3 text-base font-semibold text-ink transition-transform hover:scale-[1.02]"
          >
            {t("finalCtaButton")}
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}

// The product's most characteristic artifact: a day's slots, with one snapping
// to confirmed + deposit-paid. Static, but it shows the whole flow at a glance.
function Daybook({
  eyebrow,
  confirmed,
  depositPaid,
  held,
  open,
}: {
  eyebrow: string;
  confirmed: string;
  depositPaid: string;
  held: string;
  open: string;
}) {
  const rows = [
    { time: "10:00", state: "held" as const },
    { time: "11:30", state: "confirmed" as const },
    { time: "13:00", state: "open" as const },
    { time: "16:30", state: "open" as const },
  ];

  return (
    <div className="ledger-lines rounded-2xl border border-line bg-paper p-2 shadow-xl shadow-ink/5">
      <div className="flex items-center justify-between px-4 pb-3 pt-3">
        <span className="eyebrow">{eyebrow}</span>
        <span className="font-mono text-xs text-muted" dir="ltr">
          Sat · 14 Jun
        </span>
      </div>
      <ul className="flex flex-col">
        {rows.map((r) => {
          const isConfirmed = r.state === "confirmed";
          return (
            <li
              key={r.time}
              className={`flex items-center gap-4 rounded-xl px-4 py-3.5 ${
                isConfirmed ? "animate-slot-lock bg-ink text-paper" : ""
              }`}
            >
              <span
                className={`font-mono text-sm ${
                  isConfirmed ? "text-saffron-soft" : "text-ink"
                }`}
                dir="ltr"
              >
                {r.time}
              </span>
              <span className="h-px flex-1 bg-line/70" aria-hidden />
              {isConfirmed ? (
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium text-paper">
                    {confirmed}
                  </span>
                  <span className="rounded-full bg-saffron px-2 py-0.5 text-[0.6875rem] font-semibold text-ink">
                    {depositPaid}
                  </span>
                  <span
                    className="flex size-5 items-center justify-center rounded-full bg-saffron text-xs font-bold text-ink"
                    aria-hidden
                  >
                    ✓
                  </span>
                </span>
              ) : (
                <span className="font-mono text-xs uppercase tracking-wide text-muted">
                  {r.state === "held" ? held : open}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
