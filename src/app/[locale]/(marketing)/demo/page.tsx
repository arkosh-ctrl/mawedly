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
import { DemoBooking } from "./demo-booking";

/**
 * A public demo behind no login.
 *
 * Most SaaS sites put the product behind a signup form, so the visitor has to
 * commit before seeing anything. Removing that step is the whole point here:
 * the fastest way to explain a booking page is to let someone book on one.
 *
 * The copy is server-rendered so the page is indexable; only the flow itself is
 * a client island. A fully client-rendered demo would be an empty shell to a
 * crawler — the exact failure mode that makes JS-only pages invisible.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Demo" });
  return pageMetadata({
    locale: seoLocale(locale),
    path: "/demo",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function DemoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const loc = seoLocale(locale);
  const t = await getTranslations("Demo");
  const tNav = await getTranslations("Nav");

  return (
    <div className="mx-auto max-w-3xl px-5 py-20">
      <JsonLd
        nodes={[
          breadcrumbSchema([
            { name: tNav("home"), url: `${SITE_URL}/${loc}` },
            { name: t("h1"), url: `${SITE_URL}/${loc}/demo` },
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

      <p className="mt-8 rounded-2xl border-s-4 border-primary bg-primary-light/40 p-6 leading-relaxed text-ink">
        {t("answer")}
      </p>

      <DemoBooking />

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
