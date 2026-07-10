"use client";

import { useTranslations } from "next-intl";
import { APPOINTMENT_STATUSES } from "@/lib/appointments/status";
import type { StatusFilter } from "@/lib/appointments/use-booking-filters";

export function StatusTabs({
  value,
  counts,
  onChange,
}: {
  value: StatusFilter;
  counts: Record<string, number>;
  onChange: (status: StatusFilter) => void;
}) {
  const t = useTranslations("Appointments");

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: "all", label: t("filter.all") },
    ...APPOINTMENT_STATUSES.map((s) => ({ key: s, label: t(`status.${s}`) })),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = value === tab.key;
        const count = counts[tab.key] ?? 0;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              active
                ? "border-ink bg-ink text-paper"
                : "border-line text-muted hover:border-muted hover:text-ink"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-2 text-xs ${
                active ? "bg-paper/20 text-paper" : "bg-canvas text-muted"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
