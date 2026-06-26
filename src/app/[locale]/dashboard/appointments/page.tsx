import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { AppointmentsList, type AppointmentRow } from "./appointments-list";

export default async function AppointmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Appointments");

  // Authenticated merchant session — RLS restricts rows to their business
  // (defense in depth alongside the explicit business_id filter below).
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", userId ?? "")
    .maybeSingle();

  if (!business) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-neutral-300 px-4 py-4">
          <p className="text-sm opacity-80">{t("noBusiness")}</p>
          <Link
            href="/dashboard/settings"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            {t("goToSettings")}
          </Link>
        </div>
      </main>
    );
  }

  // Embedded relations are resolved at runtime via FKs; the hand-written
  // Database types don't infer embeds, so the result type is set explicitly.
  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "id, appointment_date, start_time, end_time, status, deposit_verified, customer_notes, customers(name, phone), services(name, price, deposit_amount), providers(name)",
    )
    .eq("business_id", business.id)
    .order("appointment_date", { ascending: true })
    .order("start_time", { ascending: true })
    .returns<AppointmentRow[]>();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm opacity-70">{t("subtitle")}</p>
      </div>
      <AppointmentsList appointments={appointments ?? []} />
    </main>
  );
}
