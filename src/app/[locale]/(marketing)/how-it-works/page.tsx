import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  SITE_URL,
  breadcrumbSchema,
  organizationSchema,
  seoLocale,
} from "@/lib/seo/site";
import { howToSchema } from "@/lib/seo/schemas";
import { JsonLd } from "@/components/json-ld";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HowItWorks" });
  return pageMetadata({
    locale: seoLocale(locale),
    path: "/how-it-works",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = seoLocale(locale);
  const t = await getTranslations("HowItWorks");
  const tNav = await getTranslations("Nav");

  // ONE array, rendered below AND passed to the HowTo schema. Two copies of the
  // same four steps would disagree the first time the copy is edited, and a
  // schema contradicting the visible page is dropped without warning.
  const steps = [
    { title: t("step1Title"), body: t("step1Body") },
    { title: t("step2Title"), body: t("step2Body") },
    { title: t("step3Title"), body: t("step3Body") },
    { title: t("step4Title"), body: t("step4Body") },
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 py-20">
      {/* HowTo is one of the few rich-result types left with real SERP space,
          and this page is already a clean numbered sequence. Breadcrumbs are
          cheap and replace the raw URL in the result with a readable trail. */}
      <JsonLd
        nodes={[
          howToSchema(loc, t("title"), t("metaDescription"), steps),
          breadcrumbSchema([
            { name: tNav("home"), url: `${SITE_URL}/${loc}` },
            { name: tNav("howItWorks"), url: `${SITE_URL}/${loc}/how-it-works` },
          ]),
          organizationSchema(loc),
        ]}
      />

      <header>
        <span className="eyebrow">{t("subtitle")}</span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {t("title")}
        </h1>
      </header>

      {/* A real sequence, so the steps are numbered along a ledger spine. */}
      <ol className="mt-14 flex flex-col">
        {steps.map((s, i) => (
          <li
            key={s.title}
            // The HowTo schema points each step at #step-N. Without these ids
            // those fragment URLs would resolve to the top of the page.
            id={`step-${i + 1}`}
            className="flex gap-5 border-t border-line py-7 first:border-t-0 sm:gap-7"
          >
            <span className="font-mono text-sm font-medium text-saffron" dir="ltr">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex flex-col gap-2">
              <h2 className="font-display text-lg font-bold text-ink">
                {s.title}
              </h2>
              <p className="leading-relaxed text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-14 rounded-3xl bg-ink p-10 text-center text-paper">
        <h2 className="font-display text-xl font-bold">{t("ctaTitle")}</h2>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-sage">
          {t("ctaBody")}
        </p>
        {/* "ابدأ الآن" / "Get started" is a signup intent, not a sign-in one —
            same class of bug as the header CTA fixed in the metadata pass. */}
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
