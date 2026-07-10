"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { ViewMode } from "@/lib/appointments/use-view-mode";
import type {
  DatePreset,
  DateRange,
  SearchKind,
} from "@/lib/appointments/use-booking-filters";

const PRESETS: DatePreset[] = ["today", "week", "month", "all"];

export function AppointmentsToolbar({
  query,
  onQuery,
  searchKind,
  range,
  onRange,
  view,
  onView,
}: {
  query: string;
  onQuery: (value: string) => void;
  searchKind: SearchKind;
  range: DateRange;
  onRange: (range: DateRange) => void;
  view: ViewMode;
  onView: (view: ViewMode) => void;
}) {
  const t = useTranslations("Appointments");
  const [dateOpen, setDateOpen] = useState(false);
  const [from, setFrom] = useState(range.from ?? "");
  const [to, setTo] = useState(range.to ?? "");
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the date menu on outside click.
  useEffect(() => {
    if (!dateOpen) return;
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDateOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [dateOpen]);

  const dateLabel =
    range.preset === "custom"
      ? t("date.custom")
      : t(`date.${range.preset}`);

  const views: { key: ViewMode; icon: string }[] = [
    { key: "list", icon: "≣" },
    { key: "cards", icon: "▤" },
    { key: "calendar", icon: "📆" },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Omni-search */}
        <div className="relative min-w-[240px] flex-1">
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-muted">
            🔍
          </span>
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={t("search.placeholder")}
            className="w-full rounded-xl border border-line bg-canvas py-2.5 pe-24 ps-10 text-sm text-ink outline-none transition-colors focus:border-saffron focus:bg-paper"
          />
          <span className="pointer-events-none absolute inset-y-0 end-2.5 flex items-center">
            <span className="rounded-md border border-line bg-paper px-2 py-0.5 text-[11px] text-muted">
              {t(`search.kind.${searchKind}`)}
            </span>
          </span>
        </div>

        {/* Date filter */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setDateOpen((o) => !o)}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm text-ink transition-colors hover:border-saffron"
          >
            📅 {dateLabel} ▾
          </button>
          {dateOpen && (
            <div className="absolute top-[calc(100%+6px)] start-0 z-30 min-w-[240px] rounded-xl border border-line bg-paper p-2 shadow-xl">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    onRange({ preset: p });
                    setDateOpen(false);
                  }}
                  className={`block w-full rounded-lg px-3 py-2 text-start text-sm transition-colors ${
                    range.preset === p
                      ? "bg-ink text-paper"
                      : "text-ink hover:bg-canvas"
                  }`}
                >
                  {t(`date.${p}`)}
                </button>
              ))}
              <div className="mt-1.5 border-t border-line pt-2">
                <label className="mb-1 block px-1 text-xs text-muted">
                  {t("date.from")}
                </label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mb-2 w-full rounded-lg border border-line bg-canvas px-2 py-1.5 text-sm text-ink"
                />
                <label className="mb-1 block px-1 text-xs text-muted">
                  {t("date.to")}
                </label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mb-2 w-full rounded-lg border border-line bg-canvas px-2 py-1.5 text-sm text-ink"
                />
                <button
                  type="button"
                  disabled={!from && !to}
                  onClick={() => {
                    onRange({ preset: "custom", from: from || undefined, to: to || undefined });
                    setDateOpen(false);
                  }}
                  className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-paper transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  {t("date.apply")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* View toggle */}
        <div className="flex gap-1 rounded-xl border border-line bg-canvas p-1">
          {views.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => onView(v.key)}
              title={t(`view.${v.key}`)}
              aria-label={t(`view.${v.key}`)}
              aria-pressed={view === v.key}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                view === v.key
                  ? "bg-paper font-semibold text-ink shadow-sm"
                  : "text-muted hover:text-ink"
              }`}
            >
              <span aria-hidden>{v.icon}</span>
              <span className="hidden sm:inline">{t(`view.${v.key}`)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
