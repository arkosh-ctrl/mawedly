import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { BookingPreview } from "@/components/marketing/booking-preview";

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
  const tBooking = await getTranslations("Booking");
  const tSignup = await getTranslations("Signup");

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

  const steps = [
    { num: "01", title: t("step1Title"), body: t("step1Body"), accent: "border-t-pine" },
    { num: "02", title: t("step2Title"), body: t("step2Body"), accent: "border-t-saffron" },
    { num: "03", title: t("step3Title"), body: t("step3Body"), accent: "border-t-ink" },
  ];

  // The three fixed business categories, labelled via the existing Signup.types
  // keys — presentation only, no new category anywhere.
  const categories = [
    tSignup("types.salon"),
    tSignup("types.consulting"),
    tSignup("types.other"),
  ];

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />

      {/* Hero — headline as thesis, beside a working miniature of the real
          booking page (the same split card shipped at /[slug]). */}
      <section className="ledger-lines border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col items-start">
            <span className="animate-fade-rise eyebrow">{t("heroBadge")}</span>
            <h1 className="animate-fade-rise mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl md:text-6xl [animation-delay:60ms]">
              {t("heroTitle")}
            </h1>
            <p className="animate-fade-rise mt-6 max-w-xl text-lg leading-relaxed text-muted [animation-delay:120ms]">
              {t("heroSubtitle")}
            </p>
            <div className="animate-fade-rise mt-9 flex w-full flex-col gap-3 sm:flex-row sm:items-center [animation-delay:180ms]">
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

            {/* The three fixed categories as quiet chips under the CTAs. */}
            <div className="animate-fade-rise mt-9 flex flex-wrap items-center gap-2 [animation-delay:240ms]">
              <span className="text-sm text-muted">{t("categoriesTitle")}</span>
              {categories.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-medium text-pine"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          <BookingPreview
            sampleName={t("preview.sampleName")}
            typeBadge={tSignup("types.salon")}
            stepService={tBooking("steps.service")}
            stepTime={tBooking("steps.time")}
            sampleService={t("preview.sampleService")}
            sampleServiceMeta={t("preview.sampleServiceMeta")}
            confirmed={t("demoConfirmed")}
            depositPaid={t("demoDepositPaid")}
          />
        </div>
      </section>

      {/* How it works — the numbered daybook rhythm shared with /[slug]. */}
      <section className="mx-auto max-w-5xl px-5 pt-20">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {t("stepsTitle")}
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.num}
              className={`flex flex-col gap-3 rounded-xl border border-line ${s.accent} border-t-[3px] bg-paper p-6 shadow-sm`}
            >
              <span className="font-mono text-xs font-bold tracking-widest text-saffron">
                {s.num}
              </span>
              <h3 className="font-display text-lg font-bold text-ink">
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Problem / Solution — the solution deliberately gets the wider page. */}
      <section className="mx-auto max-w-5xl px-5 py-20">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-[2fr_3fr]">
          <div className="bg-canvas p-8 sm:p-10">
            <span className="eyebrow text-muted">{t("problemTitle")}</span>
            <p className="mt-5 leading-relaxed text-pine">{t("problemBody")}</p>
          </div>
          <div className="bg-ink p-8 text-paper sm:p-10">
            <span className="eyebrow">{t("solutionTitle")}</span>
            <p className="mt-5 leading-relaxed text-canvas">
              {t("solutionBody")}
            </p>
          </div>
        </div>
      </section>

      {/* Features — an asymmetric zigzag: the lead capability on dark ink,
          the rest on paper with identity-coloured top rules. */}
      <section className="mx-auto max-w-5xl px-5 pb-20">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {t("featuresTitle")}
        </h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-12">
          <div className="flex flex-col gap-3 rounded-2xl bg-ink p-8 text-paper shadow-md lg:col-span-7">
            <span className="h-1 w-10 rounded-full bg-saffron" aria-hidden />
            <h3 className="font-display text-xl font-bold text-paper">
              {features[0].title}
            </h3>
            <p className="leading-relaxed text-canvas">{features[0].body}</p>
          </div>
          <FeatureCard feature={features[1]} accent="border-t-pine" span="lg:col-span-5" />
          <FeatureCard feature={features[2]} accent="border-t-saffron" span="lg:col-span-5" />
          <FeatureCard feature={features[3]} accent="border-t-ink" span="lg:col-span-7" />
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="flex flex-col items-center rounded-3xl bg-ink px-8 py-16 text-center text-paper">
          <span className="h-1 w-10 rounded-full bg-saffron" aria-hidden />
          <h2 className="mx-auto mt-6 max-w-2xl font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t("finalCtaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-canvas">
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
    <div
      className={`flex flex-col gap-3 rounded-xl border border-line ${accent} border-t-[3px] bg-paper p-8 shadow-sm ${span}`}
    >
      <span className="size-2.5 rounded-[2px] bg-saffron" aria-hidden />
      <h3 className="font-display text-lg font-bold text-ink">
        {feature.title}
      </h3>
      <p className="leading-relaxed text-muted">{feature.body}</p>
    </div>
  );
}
