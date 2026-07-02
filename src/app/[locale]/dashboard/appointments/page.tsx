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
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
          {t("title")}
        </h1>
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line bg-paper px-5 py-5">
          <p className="text-sm text-muted">{t("noBusiness")}</p>
          <Link
            href="/dashboard/settings"
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-pine"
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
      "id, appointment_date, start_time, end_time, status, deposit_verified, deposit_screenshot_path, customer_notes, customers(name, phone), services(name, price, deposit_amount), providers(name), reviews(id)",
    )
    .eq("business_id", business.id)
    .order("appointment_date", { ascending: true })
    .order("start_time", { ascending: true })
    .returns<AppointmentRow[]>();

  // Receipts are private (deposits bucket). Generate short-lived signed URLs for
  // rows that have an uploaded receipt — the owner-only storage policy permits
  // the authenticated merchant to read objects under their own business folder.
  const rows = appointments ?? [];
  const receiptUrls: Record<string, string> = {};
  await Promise.all(
    rows
      .filter((a) => a.deposit_screenshot_path)
      .map(async (a) => {
        const { data: signed } = await supabase.storage
          .from("deposits")
          .createSignedUrl(a.deposit_screenshot_path as string, 300);
        if (signed?.signedUrl) receiptUrls[a.id] = signed.signedUrl;
      }),
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="eyebrow">{t("subtitle")}</span>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
          {t("title")}
        </h1>
      </div>
      <AppointmentsList appointments={rows} receiptUrls={receiptUrls} />
    </main>
  );
}
