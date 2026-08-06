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
  const t = await getTranslations({ locale, namespace: "About" });
  return pageMetadata({
    locale: seoLocale(locale),
    path: "/about",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
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
    <div className="mx-auto max-w-2xl px-5 py-20">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {t("title")}
      </h1>

      <div className="mt-8 flex flex-col gap-5 text-lg leading-relaxed text-pine">
        <p>{t("p1")}</p>
        <p>{t("p2")}</p>
        <p>{t("p3")}</p>
      </div>

      <div className="mt-12 rounded-2xl border-s-2 border-saffron bg-paper p-8">
        <span className="eyebrow">{t("missionTitle")}</span>
        <p className="mt-4 text-lg leading-relaxed text-ink">
          {t("missionBody")}
        </p>
      </div>
    </div>
  );
}
