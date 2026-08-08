import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";
import { SITE_EMAIL, SITE_PHONE, seoLocale } from "@/lib/seo/site";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildWhatsappLink } from "@/lib/whatsapp";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });
  return pageMetadata({
    locale: seoLocale(locale),
    path: "/contact",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

// Direct contact channels — no form and no database: mailto: and wa.me only.
//
// The address and number come from @/lib/seo/site, NOT from local constants and
// NOT from the translation catalogue. They used to live in both places, and the
// email additionally in ar.json/en.json — three copies of one fact.
//
// This is NAP consistency (Name, Address, Phone): search engines treat a
// contact detail that differs between the visible page and the structured data
// as a trust signal against you. Three copies agree today by coincidence; the
// first time the support number changes, two of them go stale silently. An
// email address is a constant, not translatable content, so it has no business
// in a message catalogue either.

// Logical-direction arrow: points end-ward (→ in LTR, ← in RTL) because it
// sits inside a [dir]-aware layout and is mirrored with the rtl: variant.
function ArrowEnd() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100"
      aria-hidden="true"
    >
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function WhatsappIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-6"
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.84 9.84 0 0 0 12.04 2Zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.42 5.82c0 4.54-3.7 8.24-8.25 8.24a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24Zm-3.2 4.43c-.15 0-.4.06-.6.28-.21.22-.8.78-.8 1.9s.82 2.2.94 2.36c.11.15 1.6 2.45 3.9 3.43.54.24.97.38 1.3.48.55.18 1.04.15 1.44.09.44-.07 1.35-.55 1.54-1.08.19-.53.19-.99.13-1.08-.05-.1-.2-.15-.43-.27-.22-.11-1.34-.66-1.55-.74-.2-.07-.36-.11-.5.12-.16.22-.58.73-.71.88-.13.15-.26.17-.48.06-.22-.11-.94-.35-1.79-1.1-.66-.59-1.11-1.32-1.24-1.54-.13-.22-.01-.34.1-.45.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.07-.15.04-.28-.02-.39-.06-.11-.5-1.23-.69-1.68-.18-.44-.36-.38-.5-.39l-.42-.01Z" />
    </svg>
  );
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Contact");

  // null when the number can't be made into a valid wa.me link — hide the card.
  // SITE_PHONE is E.164 ("+966..."); normalizePhoneForWhatsapp strips every
  // non-digit, so the same single constant serves both schema.org and wa.me.
  const waLink = buildWhatsappLink(SITE_PHONE, t("whatsappText"));

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <header>
        <span className="eyebrow">{t("subtitle")}</span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-prose text-base leading-relaxed text-muted">
          {t("intro")}
        </p>
      </header>

      <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
        <a
          href={`mailto:${SITE_EMAIL}`}
          className="group flex flex-col gap-3 bg-paper p-8 transition-colors hover:bg-canvas"
        >
          <span className="text-pine" aria-hidden="true">
            <MailIcon />
          </span>
          <span className="eyebrow text-muted">{t("emailLabel")}</span>
          {/* The address itself, not a translated copy of it. */}
          <span className="font-mono text-lg text-ink" dir="ltr">
            {SITE_EMAIL}
          </span>
          <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-saffron">
            {t("emailAction")}
            <ArrowEnd />
          </span>
        </a>

        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-3 bg-paper p-8 transition-colors hover:bg-canvas"
          >
            <span className="text-pine" aria-hidden="true">
              <WhatsappIcon />
            </span>
            <span className="eyebrow text-muted">{t("whatsappLabel")}</span>
            <span className="text-lg font-semibold text-ink">
              {t("whatsappValue")}
            </span>
            <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-saffron">
              {t("whatsappAction")}
              <ArrowEnd />
            </span>
          </a>
        )}
      </div>
    </div>
  );
}
