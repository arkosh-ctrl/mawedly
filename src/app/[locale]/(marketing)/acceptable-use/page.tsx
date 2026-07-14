import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AcceptableUse" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function AcceptableUsePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("AcceptableUse");

  const sections = [
    { h: t("purposeTitle"), b: t("purposeBody") },
    { h: t("doTitle"), b: t("doBody") },
    { h: t("securityTitle"), b: t("securityBody") },
    { h: t("contentTitle"), b: t("contentBody") },
    { h: t("sensitiveTitle"), b: t("sensitiveBody") },
    { h: t("spamTitle"), b: t("spamBody") },
    { h: t("commercialTitle"), b: t("commercialBody") },
    { h: t("consequencesTitle"), b: t("consequencesBody") },
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
