import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { calculateKPIs } from "@/lib/analytics/kpi-calculator";
import type { AnalyticsAppointmentRow } from "@/lib/analytics/types";
import { AnalyticsView } from "@/components/analytics/analytics-view";

const ALLOWED_PERIODS = [7, 30, 90] as const;
const GULF_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

function gulfDate(offsetDays: number): string {
  return new Date(Date.now() + GULF_OFFSET_MS + offsetDays * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function toMinutes(t: string | null | undefined, fallback: number): number {
  if (!t) return fallback;
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m);
}

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { locale } = await params;
  const { period } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Analytics");

  const periodDays = ALLOWED_PERIODS.includes(Number(period) as 7 | 30 | 90)
    ? (Number(period) as number)
    : 30;

  // RLS-scoped: the merchant only ever reads their own business rows.
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;

  const { data: business } = await supabase
    .from("businesses")
    .select("id, work_start, work_end")
    .eq("user_id", userId ?? "")
    .maybeSingle();

  if (!business) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <PageHeader eyebrow={t("subtitle")} title={t("title")} />
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

  const currentStart = gulfDate(-(periodDays - 1));
  const previousStart = gulfDate(-(periodDays * 2 - 1));
  const previousEnd = gulfDate(-periodDays);
  const today = gulfDate(0);
  const heatmapStart = gulfDate(-89);

  const SELECT =
    "status, appointment_date, start_time, created_at, deposit_verified, services(price, duration_minutes)";

  const [{ data: current }, { data: previous }, { data: heat }, providers] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(SELECT)
        .eq("business_id", business.id)
        .gte("appointment_date", currentStart)
        .lte("appointment_date", today)
        .returns<AnalyticsAppointmentRow[]>(),
      supabase
        .from("appointments")
        .select(SELECT)
        .eq("business_id", business.id)
        .gte("appointment_date", previousStart)
        .lte("appointment_date", previousEnd)
        .returns<AnalyticsAppointmentRow[]>(),
      supabase
        .from("appointments")
        .select(SELECT)
        .eq("business_id", business.id)
        .gte("appointment_date", heatmapStart)
        .lte("appointment_date", today)
        .returns<AnalyticsAppointmentRow[]>(),
      supabase
        .from("providers")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .eq("is_active", true),
    ]);

  const data = calculateKPIs(
    current ?? [],
    previous ?? [],
    periodDays,
    heat ?? [],
    {
      workStartMinutes: toMinutes(business.work_start, 9 * 60),
      workEndMinutes: toMinutes(business.work_end, 21 * 60),
      providerCount: providers.count ?? 1,
    },
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <AnalyticsView data={data} periodDays={periodDays} />
    </main>
  );
}
