"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import {
  APPOINTMENT_STATUSES,
  ALLOWED_TRANSITIONS,
  type AppointmentStatus,
} from "@/lib/appointments/status";
import { setAppointmentStatus, setDepositVerified } from "./actions";

export type AppointmentRow = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  deposit_verified: boolean | null;
  customer_notes: string | null;
  customers: { name: string; phone: string } | null;
  services: { name: string; price: number; deposit_amount: number } | null;
  providers: { name: string } | null;
};

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  pending_verification: "bg-yellow-100 text-yellow-800 border-yellow-300",
  confirmed: "bg-green-100 text-green-800 border-green-300",
  completed: "bg-blue-100 text-blue-800 border-blue-300",
  no_show: "bg-neutral-200 text-neutral-700 border-neutral-300",
  canceled: "bg-red-100 text-red-800 border-red-300",
};

function hhmm(time: string) {
  return time.slice(0, 5);
}

export function AppointmentsList({
  appointments,
}: {
  appointments: AppointmentRow[];
}) {
  const t = useTranslations("Appointments");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | AppointmentStatus>("all");
  const [confirmCancel, setConfirmCancel] = useState<AppointmentRow | null>(null);

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
        <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm opacity-70">
          {t("empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((a) => {
            const transitions = ALLOWED_TRANSITIONS[a.status];
            return (
              <li
                key={a.id}
                className="flex flex-col gap-3 rounded-md border border-neutral-200 px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">
                      {a.customers?.name ?? "—"}
                    </span>
                    <span className="text-xs opacity-70" dir="ltr">
                      {a.customers?.phone ?? ""}
                    </span>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs ${STATUS_BADGE[a.status]}`}
                  >
                    {t(`status.${a.status}`)}
                  </span>
                </div>

                <div className="text-sm opacity-80">
                  <span>{a.services?.name ?? "—"}</span>
                  <span className="opacity-50"> · </span>
                  <span>{a.providers?.name ?? "—"}</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs opacity-70">
                  <span dir="ltr">{a.appointment_date}</span>
                  <span dir="ltr">
                    {hhmm(a.start_time)}–{hhmm(a.end_time)}
                  </span>
                  {a.services && (
                    <span>
                      {t("deposit")}: {Number(a.services.deposit_amount)}{" "}
                      {t("currency")}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {/* Deposit indicator + independent toggle */}
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      a.deposit_verified
                        ? "bg-green-100 text-green-800"
                        : "bg-neutral-200 text-neutral-700"
                    }`}
                  >
                    {a.deposit_verified
                      ? t("depositBadge.verified")
                      : t("depositBadge.pending")}
                  </span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => toggleDeposit(a.id, !a.deposit_verified)}
                    className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-100"
                  >
                    {a.deposit_verified
                      ? t("actions.clearDeposit")
                      : t("actions.verifyDeposit")}
                  </button>

                  <span className="mx-1 h-4 w-px bg-neutral-200" />

                  {/* Status transition buttons, derived from the map */}
                  {transitions.map((target) =>
                    target === "canceled" ? (
                      <button
                        key={target}
                        type="button"
                        disabled={isPending}
                        onClick={() => setConfirmCancel(a)}
                        className="rounded-md border border-red-300 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        {t("actions.canceled")}
                      </button>
                    ) : (
                      <button
                        key={target}
                        type="button"
                        disabled={isPending}
                        onClick={() => changeStatus(a.id, target)}
                        className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-100"
                      >
                        {t(`actions.${target}`)}
                      </button>
                    ),
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
        <p className="mb-4 text-sm opacity-80">{t("cancelConfirmBody")}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmCancel(null)}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100"
          >
            {t("keep")}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              confirmCancel && changeStatus(confirmCancel.id, "canceled")
            }
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {t("actions.canceled")}
          </button>
        </div>
      </Modal>
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
      className={`rounded-md border px-3 py-1 text-sm ${
        active
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-300 hover:bg-neutral-100"
      }`}
    >
      {label}
    </button>
  );
}
