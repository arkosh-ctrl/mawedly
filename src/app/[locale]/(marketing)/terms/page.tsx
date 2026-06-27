import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Terms" });
  return { title: t("metaTitle"), description: t("metaDescription") };
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
    { h: t("merchantTitle"), b: t("merchantBody") },
    { h: t("customerTitle"), b: t("customerBody") },
    { h: t("cancellationTitle"), b: t("cancellationBody") },
    { h: t("liabilityTitle"), b: t("liabilityBody") },
    { h: t("changesTitle"), b: t("changesBody") },
    { h: t("contactTitle"), b: t("contactBody") },
  ];

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-neutral-500">{t("updated")}</p>
      <p className="mt-6 leading-relaxed text-neutral-700">{t("intro")}</p>

      <div className="mt-10 flex flex-col gap-8">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-lg font-semibold text-neutral-900">{s.h}</h2>
            <p className="mt-3 leading-relaxed text-neutral-600">{s.b}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
