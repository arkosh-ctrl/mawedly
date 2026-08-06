import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  SITE_URL,
  breadcrumbSchema,
  organizationSchema,
  seoLocale,
} from "@/lib/seo/site";

/**
 * /alternatives/calendly
 *
 * Comparison pages rank for competitor terms and are cited heavily by AI answer
 * engines — but only when they are worth citing. A page that concludes "we win
 * on everything" is marketing, gets read as marketing, and is not re-quoted.
 * The "when Mawedly is the wrong choice" section below is the reason this page
 * has any authority at all; it is not a disclaimer to be trimmed later.
 *
 * EVERY FACTUAL CLAIM IS SOURCED. The figures come from Calendly's own pages,
 * dated in the copy, with the links rendered on the page so a reader can check
 * them. Pricing moves: re-verify before editing any number here, and update
 * `asOf` at the same time. Never restate a competitor's price from memory.
 */

const SOURCES = [
  { label: "calendly.com/pricing", href: "https://calendly.com/pricing" },
  {
    label: "Calendly Community — RTL and Arabic support",
    href: "https://community.calendly.com/how-do-i-40/rtl-and-arabic-support-4852",
  },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "Alternatives.calendly",
  });
  return pageMetadata({
    locale: seoLocale(locale),
    path: "/alternatives/calendly",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function CalendlyAlternativePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const loc = seoLocale(locale);
  const t = await getTranslations("Alternatives.calendly");
  const tNav = await getTranslations("Nav");

  const diffs = t.raw("diffs") as { t: string; b: string }[];
  const wrong = t.raw("wrong") as string[];
  const fit = t.raw("fit") as string[];

  const url = `${SITE_URL}/${loc}/alternatives/calendly`;

  return (
    <div className="mx-auto max-w-3xl px-5 py-20">
      {/* No FAQPage here: this is an article, not a Q&A. Breadcrumbs give the
          result a readable trail instead of a bare URL. */}
      <JsonLd
        nodes={[
          breadcrumbSchema([
            { name: tNav("home"), url: `${SITE_URL}/${loc}` },
            { name: t("h1"), url },
          ]),
          organizationSchema(loc),
        ]}
      />

      <header>
        <span className="eyebrow">{t("eyebrow")}</span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {t("h1")}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">{t("lead")}</p>
      </header>

      {/* The lift-quote: one paragraph stating the whole comparison outright.
          Extraction favours the first direct answer on the page. */}
      <p className="mt-8 rounded-2xl border-s-4 border-primary bg-primary-light/40 p-6 leading-relaxed text-ink">
        {t("answer")}
      </p>

      <p className="mt-6 text-sm text-muted">{t("asOf")}</p>

      <section className="mt-14">
        <h2 className="font-display text-xl font-bold text-ink">
          {t("diffTitle")}
        </h2>
        <ul className="mt-6 flex flex-col">
          {diffs.map((item) => (
            <li
              key={item.t}
              className="border-t border-line py-6 first:border-t-0"
            >
              <h3 className="font-display font-bold text-ink">{item.t}</h3>
              <p className="mt-2 leading-relaxed text-muted">{item.b}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Deliberately placed BEFORE the "good fit" section. A reader who bounces
          here leaves with an accurate picture, which is the point. */}
      <section className="mt-14 rounded-2xl border border-line bg-canvas p-8">
        <h2 className="font-display text-xl font-bold text-ink">
          {t("wrongTitle")}
        </h2>
        <p className="mt-3 leading-relaxed text-muted">{t("wrongLead")}</p>
        <ul className="mt-5 flex flex-col gap-3">
          {wrong.map((item) => (
            <li key={item} className="flex gap-3 leading-relaxed text-muted">
              <span aria-hidden className="text-brick">
                ✕
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-ink">
          {t("fitTitle")}
        </h2>
        <ul className="mt-5 flex flex-col gap-3">
          {fit.map((item) => (
            <li key={item} className="flex gap-3 leading-relaxed text-muted">
              <span aria-hidden className="text-primary">
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 border-t border-line pt-8">
        <h2 className="font-display text-sm font-bold text-ink">
          {t("sourcesTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted">{t("sourcesNote")}</p>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {SOURCES.map((source) => (
            <li key={source.href}>
              <a
                href={source.href}
                // Outbound to a competitor: no endorsement passed, and opening
                // in a new tab keeps the reader's place on this page.
                rel="nofollow noopener noreferrer"
                target="_blank"
                className="text-primary hover:underline"
                dir="ltr"
              >
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-14 rounded-3xl bg-ink p-10 text-center text-paper">
        <h2 className="font-display text-xl font-bold">{t("ctaTitle")}</h2>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-sage">
          {t("ctaBody")}
        </p>
        <Link
          href="/signup"
          className="mt-7 inline-block rounded-full bg-primary px-7 py-3 text-base font-semibold text-paper transition-all hover:scale-[1.02] hover:bg-primary-hover"
        >
          {t("ctaButton")}
        </Link>
      </div>
    </div>
  );
}
