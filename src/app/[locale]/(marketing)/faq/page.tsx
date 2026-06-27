import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Faq" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Faq");

  const items = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
    q: t(`q${n}`),
    a: t(`a${n}`),
  }));

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-600">
          {t("subtitle")}
        </p>
      </header>

      <div className="mt-12 flex flex-col gap-3">
        {items.map((it) => (
          <details
            key={it.q}
            className="group rounded-2xl border border-neutral-200 p-6 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold text-neutral-900">
              {it.q}
              <span className="text-emerald-600 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-4 leading-relaxed text-neutral-600">{it.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
