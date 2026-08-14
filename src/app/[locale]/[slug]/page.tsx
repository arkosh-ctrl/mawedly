import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { dynamicPageMetadata } from "@/lib/seo/metadata";
import { seoLocale, SITE_URL } from "@/lib/seo/site";
import { LocaleSwitcher } from "@/components/locale-switcher";
import {
  getBusinessForBooking,
  getActiveServices,
  getActiveProviders,
  getActiveSocialLinks,
  getBrandLogoUrl,
} from "@/lib/booking/queries";
import { PlatformIcon } from "@/components/social/platform-icon";
import { hasFeature } from "@/lib/billing/plans";
import { BookingWidget } from "./booking-widget";

import { PROFESSION_TYPES } from "@/lib/verification/professions";

// Types that have a label in Signup.types. The full profession list plus the
// legacy values written before the pivot ("salon" is already in the list;
// "consulting" is not) so existing businesses keep their badge. Anything else
// simply shows no category label.
const KNOWN_TYPES = [...PROFESSION_TYPES, "consulting"] as readonly string[];

/**
 * Per-business title and description.
 *
 * Without this, every merchant's booking page inherited the root layout's
 * title, so all of them shared one. The merchant's own name is the only honest
 * title here, and their tagline — free text they wrote themselves — is a better
 * description than anything generic.
 *
 * Deliberately NOT setting `robots`: crawl and index behaviour for these pages
 * is unchanged. Whether they belong in the index is a separate decision that
 * depends on how many real businesses exist, and it is not made here. They are
 * also still absent from the sitemap.
 *
 * getBusinessForBooking is cache()-wrapped, so this shares its query with the
 * page body below rather than doubling it.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const business = await getBusinessForBooking(slug);
  // Unknown or inactive slug → 404s below. Emitting nothing lets the notFound
  // page supply its own metadata instead of describing a business that is gone.
  if (!business) return {};

  const t = await getTranslations({ locale, namespace: "Booking" });

  return dynamicPageMetadata({
    locale: seoLocale(locale),
    path: `/${slug}`,
    // A booking page renders in whichever locale it is requested, so both
    // alternates genuinely resolve — unlike a blog post, where the translation
    // may simply not exist.
    availableLocales: ["ar", "en"],
    title: t("metaTitle", { name: business.name }),
    description:
      business.tagline?.trim() || t("metaDescription", { name: business.name }),
  });
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const business = await getBusinessForBooking(slug);
  if (!business) notFound();

  // Social icons are a paid-plan feature; skip the fetch entirely on free.
  const socialEnabled = hasFeature(
    business.plan,
    business.subscription_status,
    "social",
  );
  // Enterprise branding: logo + accent color on the public page.
  const brandingEnabled = hasFeature(
    business.plan,
    business.subscription_status,
    "branding",
  );
  const brandColor = brandingEnabled ? business.brand_color : null;
  const [services, providers, socialLinks, brandLogoUrl] = await Promise.all([
    getActiveServices(business.id),
    getActiveProviders(business.id),
    socialEnabled ? getActiveSocialLinks(business.id) : Promise.resolve([]),
    brandingEnabled && business.brand_logo_path
      ? getBrandLogoUrl(business.brand_logo_path)
      : Promise.resolve(null),
  ]);

  const t = await getTranslations("Booking");
  const tSignup = await getTranslations("Signup");

  // The merchant's own free-text intro takes priority. Only fall back to the
  // fixed category label when no tagline is set — never show a misleading badge.
  const tagline = business.tagline?.trim() || null;
  const typeLabel =
    !tagline && KNOWN_TYPES.includes(business.type)
      ? tSignup(`types.${business.type}`)
      : null;

  // Verification trust badge — one of three states:
  //   verified      → green, shows license number + issuer
  //   unverified    → red warning (regulated profession, not yet verified)
  //   not_required  → amber neutral (profession needs no license)
  const verifyState: "verified" | "unverified" | "not_required" =
    business.verification_status === "verified"
      ? "verified"
      : business.requires_license
        ? "unverified"
        : "not_required";
  const issuerLabel =
    business.license_issuer &&
    (["scfhs", "moj", "socpa", "sce", "other"] as const).includes(
      business.license_issuer as "scfhs",
    )
      ? tSignup(`license.issuers.${business.license_issuer}`)
      : null;
  const hours =
    business.work_start && business.work_end
      ? `${business.work_start.slice(0, 5)}–${business.work_end.slice(0, 5)}`
      : null;

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-14">
        {/* One card, split Calendly-style: a dark identity rail (~35%) and the
            booking flow (~65%). The rail is the first grid child, so it sits
            inline-start — right in RTL — with no locale conditionals. */}
        <div className="animate-fade-rise grid overflow-hidden rounded-2xl border border-line bg-paper shadow-lg lg:grid-cols-[7fr_13fr]">
          <aside className="flex flex-col gap-5 border-e border-line bg-paper p-6 text-ink sm:p-8">
            <span
              className="h-1 w-10 rounded-full bg-primary"
              style={brandColor ? { backgroundColor: brandColor } : undefined}
              aria-hidden
            />

            {brandLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brandLogoUrl}
                alt={business.name}
                className="h-14 w-auto max-w-[180px] self-start object-contain"
              />
            )}

            <div className="flex flex-col items-start gap-3">
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
                {business.name}
              </h1>
              {tagline ? (
                <p className="text-sm leading-snug text-muted">{tagline}</p>
              ) : (
                typeLabel && (
                  <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
                    {typeLabel}
                  </span>
                )
              )}

              {/* Practitioner verification trust badge. */}
              {verifyState === "verified" ? (
                <div className="flex flex-col gap-1 rounded-xl border border-pine/30 bg-pine/5 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-pine">
                    <VerifiedIcon />
                    {t("verify.verified")}
                  </span>
                  {business.license_number && (
                    <span className="font-mono text-[11px] text-muted" dir="ltr">
                      {business.license_number}
                      {issuerLabel ? ` · ${issuerLabel}` : ""}
                    </span>
                  )}
                </div>
              ) : verifyState === "unverified" ? (
                <div className="flex flex-col gap-1 rounded-xl border border-brick/30 bg-brick/5 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-brick">
                    <WarnIcon />
                    {t("verify.unverified")}
                  </span>
                  <span className="text-[11px] leading-snug text-muted">
                    {t("verify.unverifiedHint")}
                  </span>
                </div>
              ) : (
                <span className="rounded-full bg-saffron/15 px-3 py-1 text-[11px] font-medium text-ink/70">
                  {t("verify.notRequired")}
                </span>
              )}
            </div>

            {hours && (
              <p className="flex items-center gap-2 font-mono text-sm text-muted">
                <ClockIcon />
                <span className="sr-only">{t("hoursLabel")}</span>
                <span dir="ltr">{hours}</span>
              </p>
            )}

            <div className="mt-auto flex flex-col items-start gap-4 border-t border-line pt-5">
              {/* The merchant's public social profiles (managed in
                  /dashboard/social) — free discovery for every visitor. */}
              {socialLinks.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {socialLinks.map((l) => (
                    <a
                      key={l.platform}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={l.platform}
                      className="flex size-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-primary hover:text-primary"
                    >
                      <PlatformIcon platform={l.platform} size={16} />
                    </a>
                  ))}
                </div>
              )}
              <p className="text-sm leading-[1.6] text-muted">
                {t("subtitle")}
              </p>
              <LocaleSwitcher />
            </div>
          </aside>

          <section className="p-6 sm:p-8">
            {services.length === 0 || providers.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-canvas px-4 py-8 text-center text-sm text-muted">
                {t("notBookable")}
              </p>
            ) : (
              <BookingWidget
                slug={slug}
                services={services}
                providers={providers}
              />
            )}
          </section>
        </div>

        {/* Platform disclaimer — Mawedly is a booking tool, not a party to the
            consultation, and does not guarantee practitioner qualifications. */}
        <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-relaxed text-muted">
          {t("verify.disclaimer")}
        </p>

        {/* Powered-by badge — the product's own acquisition loop: every one of a
            merchant's customers passes through this page.
            Hidden for Enterprise, which pays for custom branding here; removing
            our mark is part of what that buys (see `branding` in plans.ts).
            The link is SAME-ORIGIN, so this is a click-through channel and not a
            backlink — the utm_* params are what make a resulting signup
            attributable once signup-source capture lands. */}
        {!brandingEnabled && (
          <p className="mt-4 text-center">
            <a
              href={`${SITE_URL}/${locale}?utm_source=booking_page&utm_medium=product&utm_campaign=powered_by`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-primary hover:text-primary"
            >
              <MawedlyMark />
              {t("poweredBy")}
            </a>
          </p>
        )}
      </div>
    </main>
  );
}

// Small calendar glyph for the powered-by badge, matched to the stroke weight
// used by the other inline icons on this page.
function MawedlyMark() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 11h18" />
    </svg>
  );
}

function VerifiedIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 12l2 2 4-4" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

// Inline clock glyph matched to the Daybook stroke weight.
function ClockIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
