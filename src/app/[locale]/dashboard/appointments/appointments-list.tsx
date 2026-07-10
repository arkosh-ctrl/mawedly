"use client";

import { useMemo, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { type AppointmentStatus } from "@/lib/appointments/status";
import { useViewMode } from "@/lib/appointments/use-view-mode";
import { useBookingFilters } from "@/lib/appointments/use-booking-filters";
import { setAppointmentStatus, setDepositVerified } from "./actions";
import { RescheduleDialog } from "./reschedule-dialog";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { AppointmentsToolbar } from "@/components/dashboard/appointments/appointments-toolbar";
import { StatusTabs } from "@/components/dashboard/appointments/status-tabs";
import { CompactListView } from "@/components/dashboard/appointments/compact-list-view";
import { CardView } from "@/components/dashboard/appointments/card-view";
import { CalendarView } from "@/components/dashboard/appointments/calendar-view";
import {
  type AppointmentRow,
  type AppointmentActions,
  hhmm,
} from "@/components/dashboard/appointments/shared";

// Re-exported for the page (server component) that types the query result.
export type { AppointmentRow };

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

  const [view, setView] = useViewMode();
  const {
    query,
    setQuery,
    status,
    setStatus,
    range,
    setRange,
    visible,
    counts,
    searchKind,
  } = useBookingFilters(appointments);

  const [confirmCancel, setConfirmCancel] = useState<AppointmentRow | null>(null);
  const [rescheduleTarget, setRescheduleTarget] =
    useState<AppointmentRow | null>(null);

  function changeStatus(id: string, next: AppointmentStatus) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", next);
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

  // WhatsApp replaced the in-app chat: the merchant reaches the customer on
  // their own phone directly (wa.me deep link with a prefilled message).
  function openWhatsapp(row: AppointmentRow) {
    const link = buildWhatsappLink(
      row.customers?.phone ?? "",
      t("whatsappMessage", {
        name: row.customers?.name ?? "",
        date: row.appointment_date,
        time: hhmm(row.start_time),
      }),
    );
    if (link) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      toast.error(t("whatsappUnavailable"));
    }
  }

  const actions: AppointmentActions = useMemo(
    () => ({
      isPending,
      receiptUrls,
      changeStatus,
      toggleDeposit,
      copyReviewLink,
      requestCancel: setConfirmCancel,
      requestReschedule: setRescheduleTarget,
      openWhatsapp,
    }),
    // changeStatus/toggleDeposit/copyReviewLink are stable within a render and
    // only depend on values captured below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPending, receiptUrls],
  );

  return (
    <div className="flex flex-col gap-4">
      <AppointmentsToolbar
        query={query}
        onQuery={setQuery}
        searchKind={searchKind}
        range={range}
        onRange={setRange}
        view={view}
        onView={setView}
      />

      <StatusTabs value={status} counts={counts} onChange={setStatus} />

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-paper px-4 py-8 text-center text-sm text-muted">
          {t("empty")}
        </p>
      ) : view === "list" ? (
        <CompactListView rows={visible} actions={actions} />
      ) : view === "cards" ? (
        <CardView rows={visible} actions={actions} />
      ) : (
        <CalendarView rows={visible} actions={actions} />
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
            className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-muted"
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
