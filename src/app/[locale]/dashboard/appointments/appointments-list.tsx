"use client";

import { useMemo, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import {
  APPOINTMENT_STATUSES,
  ALLOWED_TRANSITIONS,
  type AppointmentStatus,
} from "@/lib/appointments/status";
import { setAppointmentStatus, setDepositVerified } from "./actions";
import { RescheduleDialog } from "./reschedule-dialog";

export type AppointmentRow = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  deposit_verified: boolean | null;
  deposit_screenshot_path: string | null;
  customer_notes: string | null;
  customers: { name: string; phone: string } | null;
  services: { name: string; price: number; deposit_amount: number } | null;
  providers: { name: string } | null;
  // Present (non-empty) once a review exists for this appointment.
  reviews: { id: string }[] | null;
};

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  pending_verification: "bg-saffron/15 text-pine border-saffron/45",
  confirmed: "bg-ink text-paper border-ink",
  completed: "bg-pine/10 text-pine border-pine/35",
  no_show: "bg-canvas text-muted border-line",
  canceled: "bg-brick/10 text-brick border-brick/35",
};

function hhmm(time: string) {
  return time.slice(0, 5);
}

export function AppointmentsList({
  appointments,
  receiptUrls,
}: {
  appointments: AppointmentRow[];
  receiptUrls: Record<string, string>;
}) {
  const t = useTranslations("Appointments");
  const router = useRouter();
  const params = useParams();
  const locale = typeof params.locale === "string" ? params.locale : "ar";
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | AppointmentStatus>("all");
  const [confirmCancel, setConfirmCancel] = useState<AppointmentRow | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentRow | null>(
    null,
  );

  const visible = useMemo(
    () =>
      filter === "all"
        ? appointments
        : appointments.filter((a) => a.status === filter),
    [appointments, filter],
  );

  function changeStatus(id: string, status: AppointmentStatus) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", status);
    startTransition(async () => {
      const res = await setAppointmentStatus(fd);
      if (res.status === "success") {
        toast.success(t(`messages.${res.messageKey}`));
        setConfirmCancel(null);
        router.refresh();
      } else {
        toast.error(t(`messages.${res.messageKey}`));
      }
    });
  }

  function toggleDeposit(id: string, verified: boolean) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("verified", String(verified));
    startTransition(async () => {
      const res = await setDepositVerified(fd);
      if (res.status === "success") {
        toast.success(t(`messages.${res.messageKey}`));
        router.refresh();
      } else {
        toast.error(t(`messages.${res.messageKey}`));
      }
    });
  }

  async function copyReviewLink(id: string) {
    const url = `${window.location.origin}/${locale}/review/${id}`;
    await navigator.clipboard.writeText(url);
    toast.success(t("reviewLinkCopied"));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <FilterButton
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label={t("filter.all")}
        />
        {APPOINTMENT_STATUSES.map((s) => (
          <FilterButton
            key={s}
            active={filter === s}
            onClick={() => setFilter(s)}
            label={t(`status.${s}`)}
          />
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-paper px-4 py-8 text-center text-sm text-muted">
          {t("empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((a) => {
            const transitions = ALLOWED_TRANSITIONS[a.status];
            const needsReviewLink =
              a.status === "completed" && !a.reviews?.length;
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
                  <span className="font-mono" dir="ltr">{a.appointment_date}</span>
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
                  {/* Deposit indicator + independent toggle */}
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
                    onClick={() => toggleDeposit(a.id, !a.deposit_verified)}
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

                  {/* Status transition buttons, derived from the map */}
                  {transitions.map((target) =>
                    target === "canceled" ? (
                      <button
                        key={target}
                        type="button"
                        disabled={isPending}
                        onClick={() => setConfirmCancel(a)}
                        className="rounded-full border border-brick/40 px-2.5 py-1 text-xs text-brick transition-colors hover:bg-brick/5"
                      >
                        {t("actions.canceled")}
                      </button>
                    ) : (
                      <button
                        key={target}
                        type="button"
                        disabled={isPending}
                        onClick={() => changeStatus(a.id, target)}
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
                      onClick={() => setRescheduleTarget(a)}
                      className="rounded-full border border-line px-2.5 py-1 text-xs text-ink transition-colors hover:border-ink"
                    >
                      {t("actions.reschedule")}
                    </button>
                  )}

                  {needsReviewLink && (
                    <button
                      type="button"
                      onClick={() => copyReviewLink(a.id)}
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
      )}

      <Modal
        open={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        title={t("cancelConfirmTitle")}
      >
        <p className="mb-4 text-sm text-muted">{t("cancelConfirmBody")}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmCancel(null)}
            className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-ink"
          >
            {t("keep")}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              confirmCancel && changeStatus(confirmCancel.id, "canceled")
            }
            className="rounded-full bg-brick px-4 py-2 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {t("actions.canceled")}
          </button>
        </div>
      </Modal>

      <RescheduleDialog
        appointment={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
      />
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-line text-muted hover:border-ink hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
