import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("About");

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
        {t("title")}
      </h1>

      <div className="mt-8 flex flex-col gap-5 text-lg leading-relaxed text-neutral-700">
        <p>{t("p1")}</p>
        <p>{t("p2")}</p>
        <p>{t("p3")}</p>
      </div>

      <div className="mt-10 rounded-2xl border-s-4 border-emerald-500 bg-emerald-50/60 p-7">
        <h2 className="text-lg font-bold text-emerald-800">
          {t("missionTitle")}
        </h2>
        <p className="mt-2 leading-relaxed text-neutral-700">
          {t("missionBody")}
        </p>
      </div>
    </div>
  );
}
