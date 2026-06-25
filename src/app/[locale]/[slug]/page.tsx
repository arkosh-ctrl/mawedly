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
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{business.name}</h1>
        <LocaleSwitcher />
      </div>
      <p className="text-sm opacity-70">{t("subtitle")}</p>

      {services.length === 0 || providers.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm opacity-70">
          {t("notBookable")}
        </p>
      ) : (
        <BookingWidget slug={slug} services={services} providers={providers} />
      )}
    </main>
  );
}
