import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasFeature } from "@/lib/billing/plans";
import { PageHeader } from "@/components/dashboard/page-header";
import { UpgradeCard } from "@/components/dashboard/upgrade-card";
import { getAnalytics } from "@/lib/analytics/get-analytics";
import { AnalyticsView } from "@/components/analytics/analytics-view";

const ALLOWED_PERIODS = [7, 30, 90];

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

  const periodDays = ALLOWED_PERIODS.includes(Number(period))
    ? Number(period)
    : 30;

  // Plan gate: analytics ships with center_99 and up.
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const { data: bizPlan } = await supabase
    .from("businesses")
    .select("plan, subscription_status")
    .eq("user_id", (claims?.claims?.sub as string | undefined) ?? "")
    .maybeSingle();
  if (
    bizPlan &&
    !hasFeature(bizPlan.plan, bizPlan.subscription_status, "analytics")
  ) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <PageHeader eyebrow={t("subtitle")} title={t("title")} />
        <UpgradeCard
          featureTitle={t("locked.title")}
          featureBody={t("locked.body")}
        />
      </main>
    );
  }

  const data = await getAnalytics(periodDays);

  if (!data) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <PageHeader eyebrow={t("subtitle")} title={t("title")} />
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line bg-paper px-5 py-5">
          <p className="text-sm text-muted">{t("noBusiness")}</p>
          <Link
            href="/dashboard/settings"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-primary-hover"
          >
            {t("goToSettings")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <AnalyticsView data={data} periodDays={periodDays} />
    </main>
  );
}
