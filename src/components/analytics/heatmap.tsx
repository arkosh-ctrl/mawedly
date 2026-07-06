"use client";

import { useTranslations } from "next-intl";
import type { HeatCell } from "@/lib/analytics/types";

// Gulf week: 0 = Saturday .. 6 = Friday.
const DAYS = [0, 1, 2, 3, 4, 5, 6];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

// saffron (#c2881b) as rgb, tinted by intensity.
function cellColor(count: number, max: number): string {
  if (count <= 0) return "var(--color-canvas)";
  const intensity = 0.15 + 0.85 * (count / max);
  return `rgba(194, 136, 27, ${intensity.toFixed(2)})`;
}

/**
 * Peak-hours heatmap (day × hour). Pure CSS grid, no dependency. Plotted LTR so
 * the hour axis ascends left→right (consistent with the trend chart).
 */
export function Heatmap({ data }: { data: HeatCell[] }) {
  const t = useTranslations("Analytics");
  const max = Math.max(1, ...data.map((d) => d.count));
  const lookup = new Map(data.map((d) => [d.day * 24 + d.hour, d.count]));
  const countAt = (day: number, hour: number) =>
    lookup.get(day * 24 + hour) ?? 0;

  return (
    <section className="rounded-2xl border border-line bg-paper p-5">
      <h3 className="mb-4 font-display text-lg font-bold text-ink">
        {t("heatmapTitle")}
      </h3>

      <div dir="ltr" className="overflow-x-auto">
        <div
          className="grid min-w-[520px] gap-1"
          style={{
            gridTemplateColumns: `auto repeat(${HOURS.length}, minmax(0, 1fr))`,
          }}
        >
          <div />
          {HOURS.map((h) => (
            <div key={h} className="text-center text-[10px] text-muted">
              {h}
            </div>
          ))}

          {DAYS.map((day) => (
            <div key={day} className="contents">
              <div className="pe-2 text-end text-[11px] text-muted">
                {t(`day_${day}`)}
              </div>
              {HOURS.map((hour) => {
                const c = countAt(day, hour);
                return (
                  <div
                    key={hour}
                    className="aspect-square rounded"
                    style={{ backgroundColor: cellColor(c, max) }}
                    title={`${t(`day_${day}`)} ${hour}:00 — ${c}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">{t("heatmapHint")}</p>
    </section>
  );
}
