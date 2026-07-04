"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  type AppointmentRow,
  type AppointmentActions,
  STATUS_DOT,
} from "./shared";
import { CardView } from "./card-view";

/** Local YYYY-MM-DD without UTC drift. */
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Mode C — month grid with color-coded density dots. Clicking a day opens a
 * slide-over listing that day's appointments (reusing the card layout).
 */
export function CalendarView({
  rows,
  actions,
}: {
  rows: AppointmentRow[];
  actions: AppointmentActions;
}) {
  const t = useTranslations("Appointments");
  const locale = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, AppointmentRow[]>();
    for (const a of rows) {
      const list = map.get(a.appointment_date) ?? [];
      list.push(a);
      map.set(a.appointment_date, list);
    }
    return map;
  }, [rows]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
        month: "long",
        year: "numeric",
      }).format(new Date(cursor.year, cursor.month, 1)),
    [cursor, locale],
  );

  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
      weekday: "short",
    });
    // Week starts Sunday (index 0), matching the Gulf calendar convention.
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(2023, 0, 1 + i)),
    );
  }, [locale]);

  const firstDow = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const today = ymd(new Date());

  function shift(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  const selectedRows = selectedDay ? byDate.get(selectedDay) ?? [] : [];

  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label={t("calendar.prev")}
          className="rounded-lg border border-line px-3 py-1 text-ink transition-colors hover:border-ink"
        >
          {dir === "rtl" ? "›" : "‹"}
        </button>
        <span className="font-display font-bold text-ink">{monthLabel}</span>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label={t("calendar.next")}
          className="rounded-lg border border-line px-3 py-1 text-ink transition-colors hover:border-ink"
        >
          {dir === "rtl" ? "‹" : "›"}
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {weekdays.map((w) => (
          <div key={w} className="py-1 text-center text-xs text-muted">
            {w}
          </div>
        ))}
        {Array.from({ length: firstDow }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = ymd(new Date(cursor.year, cursor.month, day));
          const dayRows = byDate.get(dateStr) ?? [];
          const isToday = dateStr === today;
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => dayRows.length && setSelectedDay(dateStr)}
              className={`flex aspect-square flex-col rounded-lg border p-1.5 text-start transition-colors ${
                dayRows.length
                  ? "border-line hover:border-saffron hover:bg-canvas"
                  : "border-transparent"
              }`}
            >
              <span
                className={`text-xs font-semibold ${
                  isToday
                    ? "flex size-5 items-center justify-center rounded-full bg-ink text-paper"
                    : "text-ink"
                }`}
              >
                {new Intl.NumberFormat(locale === "ar" ? "ar" : "en").format(day)}
              </span>
              <span className="mt-auto flex flex-wrap gap-0.5">
                {dayRows.slice(0, 4).map((r) => (
                  <span
                    key={r.id}
                    className={`size-1.5 rounded-full ${STATUS_DOT[r.status]}`}
                    aria-hidden
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {/* Slide-over */}
      <div
        className={`fixed inset-0 z-40 bg-ink/35 transition-opacity ${
          selectedDay
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={() => setSelectedDay(null)}
        aria-hidden
      />
      <aside
        dir={dir}
        className={`fixed inset-y-0 start-0 z-50 w-[380px] max-w-[90vw] overflow-auto bg-paper p-5 shadow-2xl transition-transform ${
          selectedDay ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
        }`}
        aria-hidden={!selectedDay}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">
              {t("calendar.dayTitle")}
            </h3>
            {selectedDay && (
              <p className="font-mono text-xs text-muted" dir="ltr">
                {selectedDay} · {selectedRows.length}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSelectedDay(null)}
            aria-label={t("calendar.close")}
            className="rounded-lg border border-line px-3 py-1 text-ink transition-colors hover:border-ink"
          >
            ✕
          </button>
        </div>
        {selectedRows.length > 0 && (
          <CardView rows={selectedRows} actions={actions} />
        )}
      </aside>
    </div>
  );
}
