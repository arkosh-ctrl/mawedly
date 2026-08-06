import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  SITE_URL,
  breadcrumbSchema,
  organizationSchema,
  seoLocale,
} from "@/lib/seo/site";
import { faqPageSchema } from "@/lib/seo/schemas";
import { JsonLd } from "@/components/json-ld";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Faq" });
  return pageMetadata({
    locale: seoLocale(locale),
    path: "/faq",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = seoLocale(locale);
  const t = await getTranslations("Faq");
  const tNav = await getTranslations("Nav");

  // ONE array, rendered below AND passed to the schema — never two copies.
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((n) => ({
    q: t(`q${n}`),
    a: t(`a${n}`),
  }));

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <JsonLd
        nodes={[
          faqPageSchema(loc, items),
          breadcrumbSchema([
            { name: tNav("home"), url: `${SITE_URL}/${loc}` },
            { name: tNav("faq"), url: `${SITE_URL}/${loc}/faq` },
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

      <div className="mt-12 overflow-hidden rounded-2xl border border-line bg-paper">
        {items.map((it) => (
          <details
            key={it.q}
            className="group border-t border-line p-6 first:border-t-0 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 font-display font-bold text-ink">
              {it.q}
              <span
                className="font-mono text-lg text-saffron transition-transform group-open:rotate-45"
                aria-hidden
              >
                +
              </span>
            </summary>
            <p className="mt-4 leading-relaxed text-muted">{it.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
