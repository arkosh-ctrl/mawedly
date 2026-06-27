import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HowItWorks" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HowItWorks");

  const steps = [
    { title: t("step1Title"), body: t("step1Body") },
    { title: t("step2Title"), body: t("step2Body") },
    { title: t("step3Title"), body: t("step3Body") },
    { title: t("step4Title"), body: t("step4Body") },
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-600">
          {t("subtitle")}
        </p>
      </header>

      <ol className="mt-14 flex flex-col gap-6">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className="flex gap-5 rounded-2xl border border-neutral-200 p-6"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-lg font-bold text-white">
              {i + 1}
            </span>
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-neutral-900">
                {s.title}
              </h2>
              <p className="leading-relaxed text-neutral-600">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 rounded-2xl bg-emerald-50 p-8 text-center">
        <h2 className="text-xl font-bold text-emerald-800">{t("ctaTitle")}</h2>
        <p className="mt-2 text-neutral-700">{t("ctaBody")}</p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 px-7 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t("ctaButton")}
        </Link>
      </div>
    </div>
  );
}
