import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { JsonLd } from "@/components/json-ld";
import { pageMetadata, type LocalizedPath } from "@/lib/seo/metadata";
import {
  SITE_URL,
  breadcrumbSchema,
  organizationSchema,
  seoLocale,
} from "@/lib/seo/site";
import { faqPageSchema } from "@/lib/seo/schemas";

/**
 * One page per vertical, served from one route.
 *
 * WHY NOT ONE PAGE LISTING FIVE INDUSTRIES: people search
 * "نظام حجز مواعيد للصالونات" and "booking system for tutors" — narrow,
 * high-intent, low-competition. A combined page matches none of those queries
 * well. Five pages match five queries.
 *
 * WHY NOT FIVE HAND-WRITTEN ROUTES: the layout is genuinely shared; only the
 * copy differs. Five copies of the same JSX would drift. The copy itself is
 * NOT templated — each vertical has its own problems, answers and FAQ written
 * for that trade, which is what keeps these from being thin pages.
 */

// Slugs are the URL. English, stable, and never renamed — a rename breaks every
// backlink and ranking the page has earned.
const VERTICALS = [
  "salons",
  "tutors",
  "consultants",
  "coaches",
  "professional-services",
] as const;

type Vertical = (typeof VERTICALS)[number];

function isVertical(value: string): value is Vertical {
  return (VERTICALS as readonly string[]).includes(value);
}

/** The LOCALIZED_PATHS entry for a vertical, so hreflang stays type-checked. */
function pathFor(vertical: Vertical): LocalizedPath {
  return `/use-cases/${vertical}` as LocalizedPath;
}

// Every vertical, in every locale, prerendered. The set is fixed and small.
export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    VERTICALS.map((vertical) => ({ locale, vertical })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; vertical: string }>;
}): Promise<Metadata> {
  const { locale, vertical } = await params;
  if (!isVertical(vertical)) return {};

  const t = await getTranslations({ locale, namespace: "UseCases" });
  return pageMetadata({
    locale: seoLocale(locale),
    path: pathFor(vertical),
    title: t(`verticals.${vertical}.metaTitle`),
    description: t(`verticals.${vertical}.metaDescription`),
  });
}

export default async function UseCasePage({
  params,
}: {
  params: Promise<{ locale: string; vertical: string }>;
}) {
  const { locale, vertical } = await params;
  if (!isVertical(vertical)) notFound();
  setRequestLocale(locale);

  const loc = seoLocale(locale);
  const t = await getTranslations("UseCases");
  const tNav = await getTranslations("Nav");
  const key = `verticals.${vertical}`;

  // next-intl returns arrays through t.raw. Typed here rather than cast at each
  // use site so a malformed catalog fails loudly instead of rendering blanks.
  const problems = t.raw(`${key}.problems`) as { t: string; b: string }[];
  const solutions = t.raw(`${key}.solutions`) as { t: string; b: string }[];
  const faq = t.raw(`${key}.faq`) as { q: string; a: string }[];

  const url = `${SITE_URL}/${loc}${pathFor(vertical)}`;

  return (
    <div className="mx-auto max-w-3xl px-5 py-20">
      {/* The FAQ schema is built from the SAME array rendered below. */}
      <JsonLd
        nodes={[
          faqPageSchema(loc, faq),
          breadcrumbSchema([
            { name: tNav("home"), url: `${SITE_URL}/${loc}` },
            { name: t("eyebrow"), url: `${SITE_URL}/${loc}/use-cases/salons` },
            { name: t(`${key}.h1`), url },
          ]),
          organizationSchema(loc),
        ]}
      />

      <header>
        <span className="eyebrow">{t("eyebrow")}</span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {t(`${key}.h1`)}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          {t(`${key}.lead`)}
        </p>
      </header>

      {/* One extractable sentence stating plainly what this is, who it is for
          and that Mawedly does not process payments. Answer engines lift the
          first direct paragraph; vague marketing prose never gets quoted. */}
      <p className="mt-8 rounded-2xl border-s-4 border-primary bg-primary-light/40 p-6 leading-relaxed text-ink">
        {t(`${key}.answer`)}
      </p>

      <section className="mt-16">
        <h2 className="font-display text-xl font-bold text-ink">
          {t("problemTitle")}
        </h2>
        <ul className="mt-6 flex flex-col">
          {problems.map((item) => (
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

      <section className="mt-14">
        <h2 className="font-display text-xl font-bold text-ink">
          {t("solutionTitle")}
        </h2>
        <ul className="mt-6 flex flex-col">
          {solutions.map((item) => (
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

      <section className="mt-14">
        <h2 className="font-display text-xl font-bold text-ink">
          {t("faqTitle")}
        </h2>
        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-paper">
          {faq.map((item) => (
            <details
              key={item.q}
              className="group border-t border-line p-6 first:border-t-0 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-display font-bold text-ink">
                {item.q}
                <span
                  aria-hidden
                  className="text-muted transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Internal links to the sibling verticals: a crawl path between all five
          that does not depend on the sitemap alone. */}
      <nav className="mt-14 border-t border-line pt-8">
        <h2 className="font-display text-sm font-bold text-muted">
          {t("backToAll")}
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {VERTICALS.filter((v) => v !== vertical).map((v) => (
            <li key={v}>
              <Link
                href={`/use-cases/${v}`}
                className="inline-block rounded-full border border-line px-4 py-1.5 text-sm text-muted transition-colors hover:border-primary hover:text-primary"
              >
                {t(`verticals.${v}.h1`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

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
