import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import {
  getBusinessForBooking,
  getActiveServices,
  getActiveProviders,
} from "@/lib/booking/queries";
import { BookingWidget } from "./booking-widget";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const business = await getBusinessForBooking(slug);
  if (!business) notFound();

  const [services, providers] = await Promise.all([
    getActiveServices(business.id),
    getActiveProviders(business.id),
  ]);

  const t = await getTranslations("Booking");

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-12">
        <header className="rounded-2xl border border-line bg-paper p-6 shadow-xl shadow-ink/5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="eyebrow">{t("subtitle")}</span>
              <h1 className="font-display text-2xl font-extrabold tracking-tight">
                {business.name}
              </h1>
            </div>
            <LocaleSwitcher />
          </div>
        </header>

        {services.length === 0 || providers.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-paper px-4 py-8 text-center text-sm text-muted">
            {t("notBookable")}
          </p>
        ) : (
          <BookingWidget slug={slug} services={services} providers={providers} />
        )}
      </div>
    </main>
  );
}
