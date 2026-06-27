import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Privacy" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Privacy");

  const sections = [
    { h: t("collectTitle"), b: t("collectBody") },
    { h: t("useTitle"), b: t("useBody") },
    { h: t("thirdTitle"), b: t("thirdBody") },
    { h: t("securityTitle"), b: t("securityBody") },
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
