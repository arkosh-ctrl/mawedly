import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { ShareCard } from "@/components/dashboard/share-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { gulfNow } from "@/lib/booking/availability";
import {
  INITIAL_APPOINTMENT_STATUS,
  type AppointmentStatus,
} from "@/lib/appointments/status";

// "completed" via the status union — tsc rejects any non-status string here, so
// no bare status literals leak in (single source: lib/appointments/status).
const COMPLETED_STATUS: AppointmentStatus = "completed";

// Secondary stat card: a paper surface with a thick top rule whose color gives
// each figure its own identity (pine = week, saffron = attention, ink = done).
function StatCard({
  value,
  label,
  accent,
  delay,
}: {
  value: number;
  label: string;
  accent: "pine" | "saffron" | "ink";
  delay: string;
}) {
  const accentClass = {
    pine: "border-t-pine",
    saffron: "border-t-saffron",
    ink: "border-t-ink",
  }[accent];

  return (
    <div
      className={`animate-fade-rise flex items-center justify-between gap-3 rounded-xl border border-line ${accentClass} border-t-[3px] bg-paper px-5 py-4 shadow-sm`}
      style={{ animationDelay: delay }}
    >
      <span className="text-sm text-muted">{label}</span>
      <span className="font-mono text-3xl font-bold text-ink">{value}</span>
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

  // Today in Gulf time (UTC+3) via the shared gulfNow() — the same source of
  // truth the booking flow uses. Also shown on the hero card as the ledger date.
  const { date: todayStr } = gulfNow();

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

    // ISO date strings compare safely lexicographically. Week starts on Sunday
    // (Gulf convention); the anchor is pinned to UTC noon to avoid day-rollover
    // edge cases.
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
    <main className="flex flex-col gap-8">
      <PageHeader
        eyebrow={t("overviewNav")}
        title={t("welcomeTitle")}
        subline={t("signedInAs", { email })}
        sublineDir="ltr"
      />

      {business ? (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Hero stat — today's ledger page. Dark ink surface; small text
                uses canvas/paper for contrast, saffron is kept to the rule. */}
            <section className="animate-fade-rise relative flex flex-col justify-between gap-6 overflow-hidden rounded-2xl bg-ink p-6 text-paper shadow-md lg:col-span-5 lg:row-span-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <span className="h-1 w-10 rounded-full bg-saffron" aria-hidden />
                  <h2 className="font-display text-lg font-bold text-paper">
                    {t("stats.today")}
                  </h2>
                </div>
                <span
                  dir="ltr"
                  className="rounded-md border border-pine px-2.5 py-1 font-mono text-xs text-canvas"
                >
                  {todayStr}
                </span>
              </div>
              <div className="flex items-end justify-between gap-4">
                <span className="font-mono text-7xl font-bold leading-none text-paper">
                  {stats.today}
                </span>
                <Link
                  href="/dashboard/appointments"
                  className="rounded-full border border-pine px-4 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-pine hover:text-paper"
                >
                  {t("appointmentsNav")}
                </Link>
              </div>
              <p className="text-sm text-canvas">
                {t("currentBusiness", { name: business.name })}
              </p>
            </section>

            <div className="flex flex-col gap-4 lg:col-span-7 lg:row-span-3">
              <StatCard
                value={stats.week}
                label={t("stats.week")}
                accent="pine"
                delay="60ms"
              />
              {/* Pending is actionable — the whole card links to the queue. */}
              <Link
                href="/dashboard/appointments"
                className="animate-fade-rise flex items-center justify-between gap-3 rounded-xl border border-line border-t-[3px] border-t-saffron bg-paper px-5 py-4 shadow-sm transition-colors hover:border-saffron"
                style={{ animationDelay: "120ms" }}
              >
                <span className="text-sm text-muted">{t("stats.pending")}</span>
                <span className="font-mono text-3xl font-bold text-ink">
                  {stats.pending}
                </span>
              </Link>
              <StatCard
                value={stats.completedMonth}
                label={t("stats.completedMonth")}
                accent="ink"
                delay="180ms"
              />
            </div>
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
