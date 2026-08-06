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
import { NoShowCalculator } from "./calculator";

/**
 * A free tool, not a landing page with a form on it.
 *
 * This is the linkable asset: people cite a calculator in a forum answer or a
 * newsletter, and never cite a features page. It earns links a marketing page
 * cannot, which is the entire reason it exists.
 *
 * The page is a SERVER component wrapping one small client island, so the copy,
 * the method and the honest caveat are all in the initial HTML and indexable.
 * If the whole page were client-rendered, a crawler would see an empty shell.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Tools.noShow" });
  return pageMetadata({
    locale: seoLocale(locale),
    path: "/tools/no-show-calculator",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function NoShowCalculatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const loc = seoLocale(locale);
  const t = await getTranslations("Tools.noShow");
  const tNav = await getTranslations("Nav");

  return (
    <div className="mx-auto max-w-3xl px-5 py-20">
      <JsonLd
        nodes={[
          breadcrumbSchema([
            { name: tNav("home"), url: `${SITE_URL}/${loc}` },
            {
              name: t("h1"),
              url: `${SITE_URL}/${loc}/tools/no-show-calculator`,
            },
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

      {/* The formula stated outright, in one sentence, above the tool. An answer
          engine can quote this without running anything. */}
      <p className="mt-8 rounded-2xl border-s-4 border-primary bg-primary-light/40 p-6 leading-relaxed text-ink">
        {t("answer")}
      </p>

      <NoShowCalculator />

      <section className="mt-12">
        <h2 className="font-display text-lg font-bold text-ink">
          {t("methodTitle")}
        </h2>
        <p className="mt-3 leading-relaxed text-muted">{t("methodBody")}</p>
      </section>

      {/* Stating the limits of your own tool is what makes the rest of it
          believable — and keeps the page from claiming a no-show reduction
          figure that nobody can substantiate. */}
      <section className="mt-10 rounded-2xl border border-line bg-canvas p-8">
        <h2 className="font-display text-lg font-bold text-ink">
          {t("honestTitle")}
        </h2>
        <p className="mt-3 leading-relaxed text-muted">{t("honestBody")}</p>
      </section>

      <p className="mt-8">
        <Link href="/blog" className="text-primary hover:underline">
          {t("readMore")} →
        </Link>
      </p>

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
