import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Usage } from "@/lib/billing/usage";
import type { PlanId } from "@/lib/billing/plans";

// "Your plan" card — monthly usage bar + upgrade nudges (80% warn, 100%
// block). Server component, rendered on the dashboard overview and billing
// pages.

export async function UsageCard({
  planId,
  usage,
  compact = false,
}: {
  planId: PlanId | string;
  usage: Usage;
  compact?: boolean;
}) {
  const t = await getTranslations("Billing");
  const unlimited = usage.limit === -1;
  const barColor = usage.atLimit
    ? "bg-danger"
    : usage.nearLimit
      ? "bg-warning"
      : "bg-primary";

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-display text-base font-bold text-ink">
            {t(`plans.${planId}.name`)}
          </span>
          <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary">
            {t(`plans.${planId}.price`)}
          </span>
        </div>
        {!compact && (
          <Link
            href="/dashboard/billing"
            className="text-xs font-semibold text-primary hover:underline"
          >
            {t("manage")}
          </Link>
        )}
      </div>

      {unlimited ? (
        <p className="text-sm text-muted">
          {t("usage.unlimited", { used: usage.used })}
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">
              {t("usage.label", { used: usage.used, limit: usage.limit })}
            </span>
            <span className="font-mono text-xs text-muted" dir="ltr">
              {usage.percentage}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-canvas">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${usage.percentage}%` }}
            />
          </div>
          {usage.atLimit ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-danger-light px-3 py-2">
              <span className="text-sm font-medium text-danger">
                {t("usage.blocked")}
              </span>
              <Link
                href="/dashboard/billing"
                className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-paper transition-colors hover:bg-primary-hover"
              >
                {t("usage.upgradeNow")}
              </Link>
            </div>
          ) : usage.nearLimit ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-warning-light px-3 py-2">
              <span className="text-sm font-medium text-warning">
                {t("usage.nearLimit")}
              </span>
              <Link
                href="/dashboard/billing"
                className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-paper transition-colors hover:bg-primary-hover"
              >
                {t("usage.upgradeNow")}
              </Link>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
