import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { effectivePlan, PAID_PLAN_IDS } from "@/lib/billing/plans";
import { computeUsage, type UsageRow } from "@/lib/billing/usage";
import { PageHeader } from "@/components/dashboard/page-header";
import { UsageCard } from "@/components/dashboard/usage-card";
import { BillingActions } from "./billing-actions";
import { BrandingForm } from "./branding-form";

// /dashboard/billing — current plan, monthly usage, upgrade checkout buttons
// and the Lemon Squeezy Customer Portal (cancel / payment method / invoices).

export default async function BillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Billing");

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;

  const { data: business } = await supabase
    .from("businesses")
    .select(
      "id, plan, subscription_status, subscription_renews_at, lemon_subscription_id, monthly_appointments_count, usage_reset_at, brand_color, brand_logo_path",
    )
    .eq("user_id", userId ?? "")
    .maybeSingle();

  if (!business) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <PageHeader eyebrow={t("subtitle")} title={t("title")} />
        <p className="rounded-2xl border border-dashed border-line bg-paper px-5 py-8 text-center text-sm text-muted">
          {t("noBusiness")}
        </p>
      </main>
    );
  }

  const plan = effectivePlan(business.plan, business.subscription_status);
  const usage = computeUsage(business as UsageRow);
  const renewsAt = business.subscription_renews_at
    ? business.subscription_renews_at.slice(0, 10)
    : null;
  const status = business.subscription_status;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader eyebrow={t("subtitle")} title={t("title")} />

      {status === "past_due" && (
        <div className="rounded-2xl border border-warning/30 bg-warning-light px-5 py-4 text-sm font-medium text-warning">
          {t("pastDueBanner")}
        </div>
      )}
      {status === "cancelled" && renewsAt && (
        <div className="rounded-2xl border border-line bg-canvas px-5 py-4 text-sm text-muted">
          {t("cancelledBanner", { date: renewsAt })}
        </div>
      )}

      <UsageCard planId={plan.id} usage={usage} compact />

      {plan.id !== "free" && renewsAt && status === "active" && (
        <p className="text-sm text-muted">
          {t("renewsAt", { date: renewsAt })}
        </p>
      )}

      <BillingActions
        currentPlan={plan.id}
        upgradablePlans={PAID_PLAN_IDS.filter((p) => p !== plan.id)}
        hasSubscription={Boolean(business.lemon_subscription_id)}
      />

      {/* Enterprise branding — logo + accent color on the public page. */}
      {plan.features.branding && (
        <BrandingForm
          currentColor={business.brand_color}
          hasLogo={Boolean(business.brand_logo_path)}
        />
      )}

      <p className="text-xs leading-relaxed text-muted">{t("securedByLemon")}</p>
    </main>
  );
}
