"use client";

import { useTranslations } from "next-intl";
import type { DailyTrendPoint } from "@/lib/analytics/types";

const W = 720;
const H = 240;
const PAD = { top: 16, right: 12, bottom: 28, left: 12 };

function linePath(values: number[], max: number, innerW: number, innerH: number) {
  const n = values.length;
  if (n === 0) return "";
  const stepX = n > 1 ? innerW / (n - 1) : 0;
  return values
    .map((v, i) => {
      const x = PAD.left + i * stepX;
      const y = PAD.top + innerH - (max > 0 ? (v / max) * innerH : 0);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * Zero-dependency SVG dual-line chart: bookings (pine) and revenue (saffron),
 * each scaled to its own maximum so both series read clearly. Chronological
 * left→right regardless of page direction (dir=ltr on the plot).
 */
export function TrendChart({ data }: { data: DailyTrendPoint[] }) {
  const t = useTranslations("Analytics");
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const bookings = data.map((d) => d.bookings);
  const revenue = data.map((d) => d.revenue);
  const maxBookings = Math.max(1, ...bookings);
  const maxRevenue = Math.max(1, ...revenue);

  const bookingsPath = linePath(bookings, maxBookings, innerW, innerH);
  const revenuePath = linePath(revenue, maxRevenue, innerW, innerH);

  // ~6 evenly spaced x labels.
  const labelIdx: number[] = [];
  const n = data.length;
  const step = Math.max(1, Math.floor(n / 6));
  for (let i = 0; i < n; i += step) labelIdx.push(i);
  if (n > 0 && labelIdx[labelIdx.length - 1] !== n - 1) labelIdx.push(n - 1);

  const totalBookings = bookings.reduce((a, b) => a + b, 0);
  const totalRevenue = revenue.reduce((a, b) => a + b, 0);

  return (
    <section className="rounded-2xl border border-line bg-paper p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold text-ink">
          {t("trendTitle")}
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="size-2.5 rounded-full bg-pine" />
            {t("bookings")} · {totalBookings}
          </span>
          <span className="flex items-center gap-1.5 text-muted">
            <span className="size-2.5 rounded-full bg-saffron" />
            {t("revenue")} · {Math.round(totalRevenue)} {t("currency")}
          </span>
        </div>
      </div>

      <div dir="ltr" className="w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label={t("trendTitle")}
        >
          {/* horizontal gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const y = PAD.top + innerH * f;
            return (
              <line
                key={f}
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y}
                y2={y}
                stroke="var(--color-line)"
                strokeWidth="1"
                strokeDasharray={f === 1 ? "0" : "3 3"}
              />
            );
          })}

          <path
            d={revenuePath}
            fill="none"
            stroke="var(--color-saffron)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={bookingsPath}
            fill="none"
            stroke="var(--color-pine)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* x labels */}
          {labelIdx.map((i) => {
            const stepX = n > 1 ? innerW / (n - 1) : 0;
            const x = PAD.left + i * stepX;
            return (
              <text
                key={i}
                x={x}
                y={H - 8}
                textAnchor="middle"
                fontSize="10"
                fill="var(--color-muted)"
              >
                {data[i].date.slice(5)}
              </text>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
