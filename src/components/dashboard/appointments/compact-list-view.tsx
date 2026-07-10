"use client";

import { useTranslations } from "next-intl";
import { ALLOWED_TRANSITIONS } from "@/lib/appointments/status";
import {
  type AppointmentRow,
  type AppointmentActions,
  STATUS_BADGE,
  hhmm,
} from "./shared";
import { WhatsappIcon } from "./whatsapp-icon";

/**
 * Mode A — dense, row-based table for high-volume scanning. Logical grid
 * columns keep the layout correct in both RTL and LTR without duplicated CSS.
 */
export function CompactListView({
  rows,
  actions,
}: {
  rows: AppointmentRow[];
  actions: AppointmentActions;
}) {
  const t = useTranslations("Appointments");
  // Fixed rem tracks for status/actions so header labels and cell content stay
  // vertically aligned in every row (auto tracks drifted with content width).
  const cols =
    "grid grid-cols-[1.2fr_1.1fr_1.1fr_1.5fr_7rem_8.5rem] items-center gap-3";

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-paper">
      <div
        className={`${cols} border-b border-line bg-canvas px-4 py-2.5 text-xs font-semibold text-muted`}
      >
        <span>{t("columns.customer")}</span>
        <span>{t("columns.phone")}</span>
        <span>{t("columns.time")}</span>
        <span>{t("columns.service")}</span>
        <span>{t("columns.status")}</span>
        <span className="text-end">{t("columns.actions")}</span>
      </div>

      <ul>
        {rows.map((a) => {
          const nextTransition = ALLOWED_TRANSITIONS[a.status].find(
            (s) => s !== "canceled",
          );
          return (
            <li
              key={a.id}
              className={`${cols} border-b border-line px-4 py-2.5 text-sm last:border-b-0 hover:bg-canvas/60`}
            >
              <div className="min-w-0">
                <div className="truncate font-semibold text-ink">
                  {a.customers?.name ?? "—"}
                </div>
              </div>
              <span className="truncate font-mono text-xs text-muted" dir="ltr">
                {a.customers?.phone ?? ""}
              </span>
              {/* Date + time together — with month/week filters a bare hour
                  reads as random noise. */}
              <div className="flex min-w-0 flex-col">
                <span className="font-mono text-xs text-ink" dir="ltr">
                  {hhmm(a.start_time)}
                </span>
                <span className="font-mono text-[11px] text-muted" dir="ltr">
                  {a.appointment_date}
                </span>
              </div>
              <span className="truncate text-xs text-muted">
                {a.services?.name ?? "—"}
                {a.providers?.name ? ` · ${a.providers.name}` : ""}
              </span>
              <span
                className={`w-fit whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[a.status]}`}
              >
                {t(`status.${a.status}`)}
              </span>
              <div className="flex items-center justify-end gap-1.5">
                {nextTransition && (
                  <button
                    type="button"
                    disabled={actions.isPending}
                    onClick={() => actions.changeStatus(a.id, nextTransition)}
                    title={t(`actions.${nextTransition}`)}
                    className="whitespace-nowrap rounded-lg bg-primary px-2 py-1 text-xs font-medium text-paper transition-colors hover:bg-primary-hover"
                  >
                    {t(`actions.${nextTransition}`)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => actions.openWhatsapp(a)}
                  title={t("actions.whatsapp")}
                  aria-label={t("actions.whatsapp")}
                  className="rounded-lg bg-[#25D366] p-1.5 text-paper transition-colors hover:bg-[#1DA851]"
                >
                  <WhatsappIcon size={14} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
