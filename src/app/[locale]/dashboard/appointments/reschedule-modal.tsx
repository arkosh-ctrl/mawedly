"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import type { AppointmentRow } from "./appointments-list";
import { getRescheduleSlots, rescheduleAppointment } from "./actions";

function hhmm(time: string) {
  return time.slice(0, 5);
}

// Reschedule dialog for a confirmed appointment. Picks a future date, fetches
// the owner-scoped availability grid (same slot logic as public booking), and
// saves via the server action. The DB EXCLUSION constraint is the hard guard —
// a slot taken between preview and save surfaces as a clear toast, never a
// silent failure, and the grid is refetched so the merchant sees fresh times.
export function RescheduleModal({
  appointment,
  onClose,
}: {
  appointment: AppointmentRow;
  onClose: () => void;
}) {
  const t = useTranslations("Appointments");
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slot, setSlot] = useState("");

  // Fetch availability whenever a date is chosen.
  useEffect(() => {
    setSlot("");
    setSlots([]);
    if (!date) return;

    let cancelled = false;
    setSlotsLoading(true);
    getRescheduleSlots(appointment.id, date)
      .then((res) => {
        if (!cancelled) setSlots(res);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [appointment.id, date]);

  function save() {
    const fd = new FormData();
    fd.set("id", appointment.id);
    fd.set("date", date);
    fd.set("startTime", slot);
    startSaving(async () => {
      const res = await rescheduleAppointment(fd);
      if (res.status === "success") {
        toast.success(t(`messages.${res.messageKey}`));
        onClose();
        router.refresh();
      } else {
        toast.error(t(`messages.${res.messageKey}`));
        // The taken slot may now differ — refetch the grid so the merchant
        // picks from what's actually free.
        if (date) {
          setSlot("");
          const fresh = await getRescheduleSlots(appointment.id, date);
          setSlots(fresh);
        }
      }
    });
  }

  return (
    <Modal open onClose={onClose} title={t("reschedule.title")}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          {t("reschedule.current")}:{" "}
          <span className="font-mono text-ink" dir="ltr">
            {appointment.appointment_date} {hhmm(appointment.start_time)}
          </span>
        </p>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          <span>{t("reschedule.dateLabel")}</span>
          <input
            type="date"
            dir="ltr"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-line bg-canvas px-3 py-2.5 text-start text-ink outline-none transition-colors focus:border-ink"
          />
        </label>

        {date && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink">
              {t("reschedule.pickTime")}
            </span>
            {slotsLoading ? (
              <p className="text-sm text-muted">
                {t("reschedule.loadingSlots")}
              </p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted">{t("reschedule.noSlots")}</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    dir="ltr"
                    aria-pressed={slot === s}
                    onClick={() => setSlot(s)}
                    className={`rounded-lg border px-3 py-2 font-mono text-sm transition-colors ${
                      slot === s
                        ? "border-ink bg-ink text-saffron-soft"
                        : "border-line bg-canvas text-ink hover:border-ink"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-ink"
          >
            {t("keep")}
          </button>
          <button
            type="button"
            disabled={!slot || isSaving}
            onClick={save}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-pine disabled:opacity-50"
          >
            {isSaving ? t("reschedule.saving") : t("reschedule.save")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
