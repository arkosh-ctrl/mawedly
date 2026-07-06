"use client";

import { useTranslations } from "next-intl";
import type { AnalyticsData, KPIResult } from "@/lib/analytics/types";
import { KPICard, type Sentiment } from "./kpi-card";
import { PeriodSelect } from "./period-select";
import { TrendChart } from "./trend-chart";
import { Heatmap } from "./heatmap";

function icon(path: React.ReactNode) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {path}
    </svg>
  );
}

const ICONS = {
  booking: icon(
    <>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M9 14l2 2 4-4" />
    </>,
  ),
  revenue: icon(
    <>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>,
  ),
  deposit: icon(
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M7 15h4" />
    </>,
  ),
  utilization: icon(
    <>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </>,
  ),
  noShow: icon(
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20a6 6 0 0 1 11 0M16 8l4 4M20 8l-4 4" />
    </>,
  ),
  cancel: icon(
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </>,
  ),
  leadTime: icon(
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>,
  ),
};

export function AnalyticsView({
  data,
  periodDays,
}: {
  data: AnalyticsData;
  periodDays: number;
}) {
  const t = useTranslations("Analytics");

  const pct = (v: number) => `${v.toFixed(1)}%`;
  const money = (v: number) => `${Math.round(v)} ${t("currency")}`;
  const days = (v: number) => `${v.toFixed(1)} ${t("days")}`;

  const cards: {
    key: string;
    title: string;
    value: string;
    result: KPIResult;
    sentiment: Sentiment;
    icon: React.ReactNode;
  }[] = [
    { key: "booking", title: t("bookingRate"), value: pct(data.bookingRate.value), result: data.bookingRate, sentiment: "goodUp", icon: ICONS.booking },
    { key: "revenue", title: t("revenuePerSession"), value: money(data.revenuePerSession.value), result: data.revenuePerSession, sentiment: "goodUp", icon: ICONS.revenue },
    { key: "deposit", title: t("depositCollectionRate"), value: pct(data.depositCollectionRate.value), result: data.depositCollectionRate, sentiment: "goodUp", icon: ICONS.deposit },
    { key: "slot", title: t("slotUtilization"), value: pct(data.slotUtilization.value), result: data.slotUtilization, sentiment: "goodUp", icon: ICONS.utilization },
    { key: "noshow", title: t("noShowRate"), value: pct(data.noShowRate.value), result: data.noShowRate, sentiment: "goodDown", icon: ICONS.noShow },
    { key: "cancel", title: t("cancellationRate"), value: pct(data.cancellationRate.value), result: data.cancellationRate, sentiment: "goodDown", icon: ICONS.cancel },
    { key: "lead", title: t("leadTime"), value: days(data.leadTime.value), result: data.leadTime, sentiment: "neutral", icon: ICONS.leadTime },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">{t("subtitle")}</span>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink">
            {t("title")}
          </h1>
        </div>
        <PeriodSelect current={periodDays} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <KPICard
            key={c.key}
            title={c.title}
            value={c.value}
            result={c.result}
            sentiment={c.sentiment}
            icon={c.icon}
          />
        ))}
      </div>

      <TrendChart data={data.dailyTrends} />
      <Heatmap data={data.heatmap} />
    </div>
  );
}
