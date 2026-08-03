import type { Metadata } from "next";
import { Fragment } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { BookingPreview } from "@/components/marketing/booking-preview";
import { HomePricing } from "@/components/marketing/home-pricing";
import { Reveal, GlowCard } from "@/components/marketing/motion";
import {
  SITE_URL,
  jsonLdGraph,
  organizationSchema,
  personSchema,
  type SeoLocale,
} from "@/lib/seo/site";

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
  // The route only ever serves the configured locales; narrowing here keeps the
  // schema helpers honestly typed instead of accepting any string.
  const seoLocale: SeoLocale = locale === "en" ? "en" : "ar";
  const t = await getTranslations("Home");
  const tBooking = await getTranslations("Booking");
  const tSignup = await getTranslations("Signup");

  // Organization structured data for the home page.
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: `${SITE_URL}/${locale}`,
    name: locale === "ar" ? "موعدلي" : "Mawedly",
    inLanguage: locale,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };

  const features = [
    { title: t("feature1Title"), body: t("feature1Body") },
    { title: t("feature2Title"), body: t("feature2Body") },
    { title: t("feature3Title"), body: t("feature3Body") },
    { title: t("feature4Title"), body: t("feature4Body") },
  ];

  const steps = [
    { num: "1", title: t("step1Title"), body: t("step1Body") },
    { num: "2", title: t("step2Title"), body: t("step2Body") },
    { num: "3", title: t("step3Title"), body: t("step3Body") },
  ];

  // Broad, non-sensitive audience buckets — Mawedly is a general scheduling
  // tool, not a regulated-professions marketplace. Labels come from
  // Home.categoryDesc (title from Home.categoryTitle).
  const categories = [
    { key: "education", icon: <CapIcon /> },
    { key: "business", icon: <BriefcaseIcon /> },
    { key: "health", icon: <LeafIcon /> },
    { key: "beauty", icon: <SparkleIcon /> },
    { key: "professional", icon: <ScaleIcon /> },
  ] as const;

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdGraph(
            organizationSchema(seoLocale, t("metaDescription")),
            orgJsonLd,
            personSchema(seoLocale),
          ),
        }}
      />

      {/* Hero — headline as thesis, beside a working miniature of the real
          booking page (the same split card shipped at /[slug]). */}
      <section className="border-b border-line bg-paper">
        <div className="mx-auto grid max-w-6xl items-start gap-12 px-5 py-20 sm:py-28 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col items-start">
            <span className="animate-fade-rise eyebrow">{t("heroBadge")}</span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.25] tracking-tight text-ink sm:text-5xl md:text-6xl">
              {/* Word-by-word kinetic reveal — word-level (never per-letter:
                  Arabic letterforms reshape as they join). Whitespace between
                  spans keeps normal wrapping in both directions. */}
              {t("heroTitle")
                .split(" ")
                .map((word, i) => (
                  <Fragment key={`${word}-${i}`}>
                    <span
                      className="animate-word"
                      style={{ animationDelay: `${0.2 + i * 0.12}s` }}
                    >
                      {word}
                    </span>{" "}
                  </Fragment>
                ))}
            </h1>
            <p className="animate-fade-rise mt-6 max-w-xl text-lg leading-[1.6] text-muted [animation-delay:120ms]">
              {t("heroSubtitle")}
            </p>
            <div className="animate-fade-rise mt-10 flex w-full flex-col gap-3 sm:flex-row sm:items-center [animation-delay:180ms]">
              <Link
                href="/signup"
                className="rounded-full bg-primary px-8 py-3.5 text-center text-base font-semibold text-paper shadow-sm transition-all hover:scale-[1.02] hover:bg-primary-hover"
              >
                {t("heroCtaPrimary")}
              </Link>
              <Link
                href="/how-it-works"
                className="rounded-full border border-line bg-paper px-8 py-3.5 text-center text-base font-semibold text-ink transition-colors hover:border-muted"
              >
                {t("heroCtaSecondary")}
              </Link>
            </div>
          </div>

          <BookingPreview
            sampleName={t("preview.sampleName")}
            typeBadge={tSignup("types.business")}
            stepService={tBooking("steps.service")}
            stepTime={tBooking("steps.time")}
            sampleService={t("preview.sampleService")}
            sampleServiceMeta={t("preview.sampleServiceMeta")}
            confirmed={t("demoConfirmed")}
            depositPaid={t("demoDepositPaid")}
          />
        </div>
      </section>

      {/* The five consultation fields — the same labels the signup form uses. */}
      <section className="mx-auto max-w-5xl px-5 pt-24">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {t("categoriesTitle")}
          </h2>
          <p className="max-w-2xl leading-[1.6] text-muted">{t("categoriesSubtitle")}</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => (
            <Reveal key={c.key} delay={i * 90}>
              <div className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-paper p-6 shadow-sm transition-shadow hover:shadow-md">
                <span className="flex size-11 items-center justify-center rounded-full bg-primary-light text-primary">
                  {c.icon}
                </span>
                <h3 className="font-display text-lg font-bold text-ink">
                  {t(`categoryTitle.${c.key}`)}
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  {t(`categoryDesc.${c.key}`)}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works — three numbered steps, no more. */}
      <section className="mx-auto max-w-5xl px-5 pt-24">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {t("stepsTitle")}
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.num} delay={i * 90}>
              <div className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-paper p-6 shadow-sm transition-shadow hover:shadow-md">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary">
                  {s.num}
                </span>
                <h3 className="font-display text-lg font-bold text-ink">
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How payment works — Mawedly is a scheduling tool, not a payment
          processor. Sets expectations clearly + the merchant-responsibility note. */}
      <section className="mx-auto max-w-5xl px-5 pt-24">
        <Reveal>
          <div className="rounded-2xl border border-line bg-section p-8 sm:p-10">
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {t("paymentTitle")}
            </h2>
            <p className="mt-3 leading-[1.6] text-muted">{t("paymentBody")}</p>
            <ul className="mt-6 flex flex-col gap-3">
              {(["paymentPoint1", "paymentPoint2", "paymentPoint3", "paymentPoint4"] as const).map(
                (k) => (
                  <li key={k} className="flex items-start gap-2.5 text-sm text-ink">
                    <span
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                      aria-hidden
                    />
                    <span className="leading-relaxed">{t(k)}</span>
                  </li>
                ),
              )}
            </ul>
            <p className="mt-6 rounded-xl border border-saffron/40 bg-saffron/10 px-4 py-3 text-sm leading-relaxed text-ink">
              {t("paymentNote")}
            </p>
          </div>
        </Reveal>
      </section>

      {/* Problem / Solution — the solution deliberately gets the wider page. */}
      <section className="mx-auto max-w-5xl px-5 py-24">
        <Reveal>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-sm md:grid-cols-[2fr_3fr]">
          <div className="bg-section p-8 sm:p-10">
            <span className="eyebrow text-muted">{t("problemTitle")}</span>
            <p className="mt-5 leading-[1.6] text-muted">{t("problemBody")}</p>
          </div>
          <div className="bg-ink p-8 text-paper sm:p-10">
            <span className="eyebrow text-sage">{t("solutionTitle")}</span>
            <p className="mt-5 leading-[1.6] text-canvas">
              {t("solutionBody")}
            </p>
          </div>
        </div>
        </Reveal>
      </section>

      {/* Features — an asymmetric grid: the lead capability on near-black,
          the rest on white cards with hairline borders. */}
      <section className="mx-auto max-w-5xl px-5 pb-24">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {t("featuresTitle")}
        </h2>
        <div className="mt-12 grid gap-4 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <div className="flex h-full flex-col gap-3 rounded-2xl bg-ink p-8 text-paper shadow-md">
              <span className="h-1 w-10 rounded-full bg-primary" aria-hidden />
              <h3 className="font-display text-xl font-bold text-paper">
                {features[0].title}
              </h3>
              <p className="leading-[1.6] text-sage">{features[0].body}</p>
            </div>
          </Reveal>
          <Reveal delay={90} className="lg:col-span-5">
            <FeatureCard feature={features[1]} accent="" span="h-full" />
          </Reveal>
          <Reveal delay={180} className="lg:col-span-5">
            <FeatureCard feature={features[2]} accent="" span="h-full" />
          </Reveal>
          <Reveal delay={270} className="lg:col-span-7">
            <FeatureCard feature={features[3]} accent="" span="h-full" />
          </Reveal>
        </div>
      </section>

      {/* Plans — compact pricing over the same PLANS config as /pricing. */}
      <Reveal>
        <HomePricing />
      </Reveal>

      {/* Final CTA */}
      <section className="mx-auto max-w-5xl px-5 pb-24">
        <Reveal>
        <div className="flex flex-col items-center rounded-3xl bg-ink px-8 py-20 text-center text-paper">
          <span className="h-1 w-10 rounded-full bg-primary" aria-hidden />
          <h2 className="mx-auto mt-6 max-w-2xl font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t("finalCtaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-[1.6] text-sage">
            {t("finalCtaBody")}
          </p>
          <Link
            href="/signup"
            className="mt-10 inline-block rounded-full bg-primary px-8 py-3.5 text-base font-semibold text-paper transition-all hover:scale-[1.02] hover:bg-primary-hover"
          >
            {t("finalCtaButton")}
          </Link>
        </div>
        </Reveal>
      </section>
    </MarketingShell>
  );
}

function FeatureCard({
  feature,
  accent,
  span,
}: {
  feature: { title: string; body: string };
  accent: string;
  span: string;
}) {
  return (
    <GlowCard
      className={`flex flex-col gap-3 rounded-2xl border border-line ${accent} bg-paper p-8 shadow-sm transition-shadow hover:shadow-md ${span}`}
    >
      <span className="size-2.5 rounded-full bg-primary" aria-hidden />
      <h3 className="font-display text-lg font-bold text-ink">
        {feature.title}
      </h3>
      <p className="leading-relaxed text-muted">{feature.body}</p>
    </GlowCard>
  );
}

/* Category glyphs, matched to the Daybook stroke weight (no icon dependency). */

function iconProps() {
  return {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  } as const;
}

function CapIcon() {
  return (
    <svg {...iconProps()}>
      <path d="m12 4 10 5-10 5L2 9l10-5Z" />
      <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
      <path d="M22 9v5" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M20 4c-8 0-14 4-14 11a5 5 0 0 0 5 5c7 0 9-8 9-16Z" />
      <path d="M4 20c2-5 6-9 11-11" />
    </svg>
  );
}

function ScaleIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M12 3v18" />
      <path d="M4 7h16" />
      <path d="m7 7-3 6a3.5 3.5 0 0 0 6 0L7 7Z" />
      <path d="m17 7-3 6a3.5 3.5 0 0 0 6 0l-3-6Z" />
      <path d="M8 21h8" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M12 3l1.8 4.9L19 9.5l-4.5 2.2L12 17l-2.5-5.3L5 9.5l5.2-1.6L12 3Z" />
      <path d="M19 15l.7 1.8L21.5 17.5l-1.8.7L19 20l-.7-1.8L16.5 17.5l1.8-.7L19 15Z" />
    </svg>
  );
}
