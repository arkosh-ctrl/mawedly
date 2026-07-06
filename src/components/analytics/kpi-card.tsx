"use client";

import { useTranslations } from "next-intl";
import type { KPIResult } from "@/lib/analytics/types";

// Whether a rising value is good, bad, or neutral — drives the arrow color.
export type Sentiment = "goodUp" | "goodDown" | "neutral";

export function KPICard({
  title,
  value,
  result,
  sentiment,
  icon,
}: {
  title: string;
  value: string;
  result: KPIResult;
  sentiment: Sentiment;
  icon: React.ReactNode;
}) {
  const t = useTranslations("Analytics");

  const arrow =
    result.trend === "up" ? "↑" : result.trend === "down" ? "↓" : "→";

  // Color: good direction → pine, bad direction → brick, flat/neutral → muted.
  let color = "text-muted";
  if (result.trend !== "same" && sentiment !== "neutral") {
    const rising = result.trend === "up";
    const good = sentiment === "goodUp" ? rising : !rising;
    color = good ? "text-pine" : "text-brick";
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">{title}</span>
        <span className="text-saffron" aria-hidden>
          {icon}
        </span>
      </div>

      <div
        className={`font-display text-3xl font-extrabold tracking-tight ${
          result.hasData ? "text-ink" : "text-muted/50"
        }`}
        dir="ltr"
      >
        {result.hasData ? value : "—"}
      </div>

      {result.hasData ? (
        <div className={`flex items-center gap-1 text-xs font-medium ${color}`}>
          <span dir="ltr">
            {arrow} {Math.abs(result.changePercent).toFixed(0)}%
          </span>
          <span className="text-muted">{t("vsPrevious")}</span>
        </div>
      ) : (
        <div className="text-xs text-muted">{t("notEnoughData")}</div>
      )}
    </div>
  );
}
