import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

// Placeholder contact channels — swap the email/number when the real ones are
// ready. No form and no database: direct mailto: and wa.me links only.
const CONTACT_EMAIL = "hello@mawedly.com";
const CONTACT_WHATSAPP = "966500000000";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Contact");

  const waLink = `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(
    t("whatsappText"),
  )}`;

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

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-8 transition-shadow hover:shadow-sm"
        >
          <span className="text-2xl" aria-hidden>
            ✉️
          </span>
          <span className="text-sm font-medium text-neutral-500">
            {t("emailLabel")}
          </span>
          <span className="text-lg font-semibold text-neutral-900" dir="ltr">
            {t("emailValue")}
          </span>
          <span className="text-sm font-medium text-emerald-700">
            {t("emailAction")} →
          </span>
        </a>

        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-8 transition-shadow hover:shadow-sm"
        >
          <span className="text-2xl" aria-hidden>
            💬
          </span>
          <span className="text-sm font-medium text-neutral-500">
            {t("whatsappLabel")}
          </span>
          <span className="text-lg font-semibold text-neutral-900">
            {t("whatsappValue")}
          </span>
          <span className="text-sm font-medium text-emerald-700">
            {t("whatsappAction")} →
          </span>
        </a>
      </div>
    </div>
  );
}
