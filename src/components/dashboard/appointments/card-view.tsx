"use client";

import { useTranslations } from "next-intl";
import {
  ALLOWED_TRANSITIONS,
} from "@/lib/appointments/status";
import {
  type AppointmentRow,
  type AppointmentActions,
  STATUS_BADGE,
  hhmm,
} from "./shared";

/**
 * Mode B — generous card layout. This is the detail-focused view (deposit,
 * receipt, chat, reschedule, review link, cancel) carried over from the
 * original list design.
 */
export function CardView({
  rows,
  actions,
}: {
  rows: AppointmentRow[];
  actions: AppointmentActions;
}) {
  const t = useTranslations("Appointments");
  const { isPending, receiptUrls } = actions;

  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {rows.map((a) => {
        const transitions = ALLOWED_TRANSITIONS[a.status];
        const needsReviewLink = a.status === "completed" && !a.reviews?.length;
        return (
          <li
            key={a.id}
            className="flex flex-col gap-3 rounded-xl border border-line bg-paper px-4 py-3.5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                <span className="font-display font-bold text-ink">
                  {a.customers?.name ?? "—"}
                </span>
                <span className="font-mono text-xs text-muted" dir="ltr">
                  {a.customers?.phone ?? ""}
                </span>
              </div>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[a.status]}`}
              >
                {t(`status.${a.status}`)}
              </span>
            </div>

            <div className="text-sm text-pine">
              <span>{a.services?.name ?? "—"}</span>
              <span className="text-muted"> · </span>
              <span>{a.providers?.name ?? "—"}</span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className="font-mono" dir="ltr">
                {a.appointment_date}
              </span>
              <span className="font-mono" dir="ltr">
                {hhmm(a.start_time)}–{hhmm(a.end_time)}
              </span>
              {a.services && (
                <span>
                  {t("deposit")}: {Number(a.services.deposit_amount)}{" "}
                  {t("currency")}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  a.deposit_verified
                    ? "bg-saffron/15 text-pine"
                    : "bg-canvas text-muted"
                }`}
              >
                {a.deposit_verified && (
                  <span className="size-1.5 rounded-full bg-saffron" aria-hidden />
                )}
                {a.deposit_verified
                  ? t("depositBadge.verified")
                  : t("depositBadge.pending")}
              </span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => actions.toggleDeposit(a.id, !a.deposit_verified)}
                className="rounded-full border border-line px-2.5 py-1 text-xs text-ink transition-colors hover:border-ink"
              >
                {a.deposit_verified
                  ? t("actions.clearDeposit")
                  : t("actions.verifyDeposit")}
              </button>
              {receiptUrls[a.id] && (
                <a
                  href={receiptUrls[a.id]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-line px-2.5 py-1 text-xs text-pine transition-colors hover:border-pine"
                >
                  {t("actions.viewReceipt")}
                </a>
              )}

              <span className="mx-1 h-4 w-px bg-line" />

              {transitions.map((target) =>
                target === "canceled" ? (
                  <button
                    key={target}
                    type="button"
                    disabled={isPending}
                    onClick={() => actions.requestCancel(a)}
                    className="rounded-full border border-brick/40 px-2.5 py-1 text-xs text-brick transition-colors hover:bg-brick/5"
                  >
                    {t("actions.canceled")}
                  </button>
                ) : (
                  <button
                    key={target}
                    type="button"
                    disabled={isPending}
                    onClick={() => actions.changeStatus(a.id, target)}
                    className="rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-paper transition-colors hover:bg-pine"
                  >
                    {t(`actions.${target}`)}
                  </button>
                ),
              )}

              {a.status === "confirmed" && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => actions.requestReschedule(a)}
                  className="rounded-full border border-line px-2.5 py-1 text-xs text-ink transition-colors hover:border-ink"
                >
                  {t("actions.reschedule")}
                </button>
              )}

              <button
                type="button"
                onClick={() => actions.openChat(a)}
                className="rounded-full border border-line px-2.5 py-1 text-xs text-ink transition-colors hover:border-ink"
              >
                {t("actions.chat")}
              </button>

              {needsReviewLink && (
                <button
                  type="button"
                  onClick={() => actions.copyReviewLink(a.id)}
                  className="rounded-full border border-line px-2.5 py-1 text-xs text-pine transition-colors hover:border-pine"
                >
                  {t("reviewLinkButton")}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
