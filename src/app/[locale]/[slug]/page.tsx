import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import {
  getBusinessForBooking,
  getActiveServices,
  getActiveProviders,
  getActiveSocialLinks,
} from "@/lib/booking/queries";
import { PlatformIcon } from "@/components/social/platform-icon";
import { BookingWidget } from "./booking-widget";

// Every business category with a label in Signup.types — the five consultation
// fields plus the catch-all, and the legacy values written before the pivot
// ("salon", "consulting") so existing businesses keep their badge. Anything
// else simply shows no badge.
const KNOWN_TYPES = [
  "education",
  "business",
  "nutrition",
  "legal",
  "mental_health",
  "other",
  "salon",
  "consulting",
] as const;

export default async function BookingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const business = await getBusinessForBooking(slug);
  if (!business) notFound();

  const [services, providers, socialLinks] = await Promise.all([
    getActiveServices(business.id),
    getActiveProviders(business.id),
    getActiveSocialLinks(business.id),
  ]);

  const t = await getTranslations("Booking");
  const tSignup = await getTranslations("Signup");

  const typeLabel = (KNOWN_TYPES as readonly string[]).includes(business.type)
    ? tSignup(`types.${business.type}`)
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
            <span className="h-1 w-10 rounded-full bg-primary" aria-hidden />

            <div className="flex flex-col items-start gap-3">
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
                {business.name}
              </h1>
              {typeLabel && (
                <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
                  {typeLabel}
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
      </div>
    </main>
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
