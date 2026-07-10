"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AnalyticsData } from "@/lib/analytics/types";

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

type Banner = {
  tone: "warn" | "danger";
  messageKey: string;
  href: string;
  ctaKey: string;
};

// Pick the single most important banner (danger before opportunity). Only fires
// when the underlying KPI actually has data, so a brand-new account stays calm.
function pickBanner(data: AnalyticsData): Banner | null {
  if (data.noShowRate.hasData && data.noShowRate.value > 20) {
    return {
      tone: "danger",
      messageKey: "bannerNoShow",
      href: "/dashboard/settings",
      ctaKey: "bannerNoShowCta",
    };
  }
  if (data.bookingRate.hasData && data.bookingRate.value < 30) {
    return {
      tone: "warn",
      messageKey: "bannerBooking",
      href: "/dashboard/analytics",
      ctaKey: "bannerBookingCta",
    };
  }
  if (data.slotUtilization.hasData && data.slotUtilization.value > 85) {
    return {
      tone: "warn",
      messageKey: "bannerSlots",
      href: "/dashboard/settings",
      ctaKey: "bannerSlotsCta",
    };
  }
  return null;
}

export function DashboardInsights({ data }: { data: AnalyticsData }) {
  const t = useTranslations("Dashboard.insights");

  const growth = data.totalRevenue;
  const growthArrow =
    growth.trend === "up" ? "↑" : growth.trend === "down" ? "↓" : "→";
  const growthColor =
    growth.trend === "up"
      ? "text-pine"
      : growth.trend === "down"
        ? "text-brick"
        : "text-muted";

  const banner = pickBanner(data);

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Revenue growth vs previous 30 days */}
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-paper p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
            <Icon>
              <path d="M23 6l-9.5 9.5-5-5L1 18" />
              <path d="M17 6h6v6" />
            </Icon>
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted">{t("revenueGrowth")}</p>
            {growth.hasData ? (
              <p className={`font-display text-lg font-bold ${growthColor}`} dir="ltr">
                {growthArrow} {Math.abs(growth.changePercent).toFixed(0)}%
              </p>
            ) : (
              <p className="font-display text-lg font-bold text-muted/50">—</p>
            )}
            <p className="text-[11px] text-muted">{t("vsLastMonth")}</p>
          </div>
        </div>

        {/* Month revenue */}
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-paper p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-saffron/15 text-saffron">
            <Icon>
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </Icon>
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted">{t("monthRevenue")}</p>
            <p className="font-display text-lg font-bold text-ink" dir="ltr">
              {Math.round(growth.value)} {t("currency")}
            </p>
            <p className="text-[11px] text-muted">{t("last30")}</p>
          </div>
        </div>

        {/* No-show alert — only when there were no-shows */}
        {data.noShowCount > 0 ? (
          <div className="flex items-center gap-4 rounded-2xl border border-brick/30 bg-brick/5 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brick/10 text-brick">
              <Icon>
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                <path d="M12 9v4M12 17h.01" />
              </Icon>
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted">{t("noShowAlert")}</p>
              <p className="font-display text-lg font-bold text-brick" dir="ltr">
                {data.noShowCount}
              </p>
              <p className="text-[11px] text-muted">{t("noShowThisPeriod")}</p>
            </div>
          </div>
        ) : (
          // Quick link fills the third slot when there's no alert.
          <Link
            href="/dashboard/analytics"
            className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-paper p-4 transition-colors hover:border-saffron"
          >
            <div className="flex items-center gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink">
                <Icon>
                  <path d="M3 3v18h18" />
                  <path d="M18.5 8 13.4 13.2l-2.8-2.7L7 14.3" />
                </Icon>
              </span>
              <p className="text-sm font-semibold text-ink">
                {t("analyticsLink")}
              </p>
            </div>
            <span className="text-muted" aria-hidden>
              ›
            </span>
          </Link>
        )}
      </div>

      {banner && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
            banner.tone === "danger"
              ? "border-brick/30 bg-brick/5"
              : "border-saffron/40 bg-saffron/10"
          }`}
        >
          <p
            className={`text-sm font-medium ${
              banner.tone === "danger" ? "text-brick" : "text-ink"
            }`}
          >
            {t(banner.messageKey)}
          </p>
          <Link
            href={banner.href}
            className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-muted"
          >
            {t(banner.ctaKey)}
          </Link>
        </div>
      )}

      {/* When a no-show alert took the third card slot, still expose the
          analytics quick link as a slim row. */}
      {data.noShowCount > 0 && (
        <Link
          href="/dashboard/analytics"
          className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4 py-3 transition-colors hover:border-saffron"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="text-saffron">
              <Icon>
                <path d="M3 3v18h18" />
                <path d="M18.5 8 13.4 13.2l-2.8-2.7L7 14.3" />
              </Icon>
            </span>
            {t("analyticsLink")}
          </span>
          <span className="text-muted" aria-hidden>
            ›
          </span>
        </Link>
      )}
    </section>
  );
}
