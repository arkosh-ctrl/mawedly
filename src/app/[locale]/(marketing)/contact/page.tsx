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
      <header>
        <span className="eyebrow">{t("subtitle")}</span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {t("title")}
        </h1>
      </header>

      <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="group flex flex-col gap-3 bg-paper p-8 transition-colors hover:bg-canvas"
        >
          <span className="eyebrow text-muted">{t("emailLabel")}</span>
          <span className="font-mono text-lg text-ink" dir="ltr">
            {t("emailValue")}
          </span>
          <span className="mt-2 text-sm font-medium text-saffron">
            {t("emailAction")} →
          </span>
        </a>

        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col gap-3 bg-paper p-8 transition-colors hover:bg-canvas"
        >
          <span className="eyebrow text-muted">{t("whatsappLabel")}</span>
          <span className="text-lg font-semibold text-ink">
            {t("whatsappValue")}
          </span>
          <span className="mt-2 text-sm font-medium text-saffron">
            {t("whatsappAction")} →
          </span>
        </a>
      </div>
    </div>
  );
}
