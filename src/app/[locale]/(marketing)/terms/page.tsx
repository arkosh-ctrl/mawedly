import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";
import { seoLocale } from "@/lib/seo/site";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Terms" });
  return pageMetadata({
    locale: seoLocale(locale),
    path: "/terms",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Terms");

  const sections = [
    { h: t("natureTitle"), b: t("natureBody") },
    { h: t("ageTitle"), b: t("ageBody") },
    { h: t("acceptableTitle"), b: t("acceptableBody") },
    { h: t("definitionsTitle"), b: t("definitionsBody") },
    { h: t("merchantTitle"), b: t("merchantBody") },
    { h: t("customerTitle"), b: t("customerBody") },
    { h: t("paymentTitle"), b: t("paymentBody") },
    { h: t("cancellationTitle"), b: t("cancellationBody") },
    { h: t("practitionerTitle"), b: t("practitionerBody") },
    { h: t("liabilityTitle"), b: t("liabilityBody") },
    { h: t("ipTitle"), b: t("ipBody") },
    { h: t("terminationTitle"), b: t("terminationBody") },
    { h: t("changesTitle"), b: t("changesBody") },
    { h: t("governingLawTitle"), b: t("governingLawBody") },
    { h: t("contactTitle"), b: t("contactBody") },
  ];

  return (
    <div className="mx-auto max-w-2xl px-5 py-20">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-2 font-mono text-xs text-muted">{t("updated")}</p>
      <p className="mt-6 leading-relaxed text-pine">{t("intro")}</p>

      <div className="mt-10 flex flex-col">
        {sections.map((s) => (
          <section key={s.h} className="border-t border-line py-7 first:border-t-0">
            <h2 className="font-display text-lg font-bold text-ink">{s.h}</h2>
            <p className="mt-3 leading-relaxed text-muted">{s.b}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
