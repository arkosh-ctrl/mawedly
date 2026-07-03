"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { getRescheduleSlots, rescheduleAppointment } from "./actions";
import type { AppointmentRow } from "./appointments-list";

function hhmm(time: string) {
  return time.slice(0, 5);
}

// Merchant-only reschedule dialog for a confirmed appointment. Reuses the public
// booking widget's slot-grid look, but is self-contained: it fetches available
// times through the owner-scoped getRescheduleSlots action (the appointment's own
// slot is included) and saves via rescheduleAppointment.
export function RescheduleDialog({
  appointment,
  onClose,
}: {
  appointment: AppointmentRow | null;
  onClose: () => void;
}) {
  const t = useTranslations("Appointments");
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slot, setSlot] = useState("");
  const [isSaving, startSaving] = useTransition();

  const appointmentId = appointment?.id ?? null;

  // Reset when the dialog opens for a different appointment (or closes).
  useEffect(() => {
    setDate("");
    setSlots([]);
    setSlot("");
  }, [appointmentId]);

  // Fetch available slots (self-excluded) whenever a date is chosen.
  useEffect(() => {
    setSlot("");
    setSlots([]);
    if (!appointmentId || !date) return;

    let cancelled = false;
    setSlotsLoading(true);
    getRescheduleSlots(appointmentId, date)
      .then((res) => {
        if (cancelled) return;
        setSlots(res.status === "success" ? res.slots : []);
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
  }, [appointmentId, date]);

  function save() {
    if (!appointmentId || !slot) return;
    const fd = new FormData();
    fd.set("id", appointmentId);
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
      }
    });
  }

  return (
    <Modal open={!!appointment} onClose={onClose} title={t("reschedule.title")}>
      {appointment && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-line bg-canvas px-4 py-3 text-sm">
            <span className="text-muted">{t("reschedule.current")}: </span>
            <span className="font-mono text-ink" dir="ltr">
              {appointment.appointment_date} · {hhmm(appointment.start_time)}
            </span>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            <span>{t("reschedule.newDate")}</span>
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
                          ? "border-ink bg-ink font-semibold text-paper"
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
              {t("reschedule.cancel")}
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
      )}
    </Modal>
  );
}
