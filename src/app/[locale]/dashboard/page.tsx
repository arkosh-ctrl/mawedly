import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { ShareCard } from "@/components/dashboard/share-card";
import { gulfNow } from "@/lib/booking/availability";
import {
  INITIAL_APPOINTMENT_STATUS,
  type AppointmentStatus,
} from "@/lib/appointments/status";

// "completed" via the status union — tsc rejects any non-status string here, so
// no bare status literals leak in (single source: lib/appointments/status).
const COMPLETED_STATUS: AppointmentStatus = "completed";

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-paper px-4 py-4">
      <span className="font-mono text-3xl font-bold text-ink">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Dashboard");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const email = (claimsData?.claims?.email as string | undefined) ?? "";
  const userId = claimsData?.claims?.sub as string | undefined;

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug")
    .eq("user_id", userId ?? "")
    .maybeSingle();

  // Stat counts derived from a single appointments read (RLS as defense in depth
  // alongside the explicit business_id filter — no service_role). The four
  // figures are computed in code rather than via four separate count queries.
  const stats = { today: 0, week: 0, pending: 0, completedMonth: 0 };
  if (business) {
    const { data: rows } = await supabase
      .from("appointments")
      .select("appointment_date, status")
      .eq("business_id", business.id)
      .returns<{ appointment_date: string; status: AppointmentStatus }[]>();

    // Date boundaries in Gulf time (UTC+3) via the shared gulfNow() — the same
    // source of truth the booking flow uses. ISO date strings compare safely
    // lexicographically. Week starts on Sunday (Gulf convention); the anchor is
    // pinned to UTC noon to avoid day-rollover edge cases.
    const { date: todayStr } = gulfNow();
    const anchor = new Date(`${todayStr}T12:00:00Z`);
    const weekStartDate = new Date(anchor);
    weekStartDate.setUTCDate(anchor.getUTCDate() - anchor.getUTCDay());
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 6);
    const weekStart = weekStartDate.toISOString().slice(0, 10);
    const weekEnd = weekEndDate.toISOString().slice(0, 10);
    const monthStr = todayStr.slice(0, 7);

    for (const r of rows ?? []) {
      const d = r.appointment_date;
      if (d === todayStr) stats.today += 1;
      if (d >= weekStart && d <= weekEnd) stats.week += 1;
      if (r.status === INITIAL_APPOINTMENT_STATUS) stats.pending += 1;
      if (r.status === COMPLETED_STATUS && d.startsWith(monthStr)) {
        stats.completedMonth += 1;
      }
    }
  }

  const allZero =
    stats.today === 0 &&
    stats.week === 0 &&
    stats.pending === 0 &&
    stats.completedMonth === 0;

  return (
    <main className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
        {t("welcomeTitle")}
      </h1>
      <p className="font-mono text-sm text-muted" dir="ltr">
        {t("signedInAs", { email })}
      </p>

      {business ? (
        <>
          <p className="text-pine">
            {t("currentBusiness", { name: business.name })}
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard value={stats.today} label={t("stats.today")} />
            <StatCard value={stats.week} label={t("stats.week")} />
            <StatCard value={stats.pending} label={t("stats.pending")} />
            <StatCard
              value={stats.completedMonth}
              label={t("stats.completedMonth")}
            />
          </div>

          {allZero && (
            <p className="rounded-2xl border border-dashed border-line bg-canvas px-4 py-3 text-sm text-pine">
              {t("stats.emptyHint")}
            </p>
          )}

          <ShareCard
            slug={business.slug}
            businessName={business.name}
            locale={locale}
          />
        </>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line bg-paper px-5 py-5">
          <p className="text-sm text-muted">{t("noBusiness")}</p>
          <Link
            href="/dashboard/settings"
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-pine"
          >
            {t("completeSetup")}
          </Link>
        </div>
      )}
    </main>
  );
}
