"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "@/app/[locale]/dashboard/notifications-actions";
import { NOTIFICATION_TYPES } from "@/lib/notifications/types";
import type {
  NotificationType,
  TypeSetting,
} from "@/lib/notifications/types";

// Types the merchant can actually configure (payment_* and system_announcement
// are system-driven and not shown as toggles).
const CONFIGURABLE: NotificationType[] = [
  "new_booking",
  "reminder_1h",
  "reminder_30m",
  "reminder_15m",
  "new_chat_message",
  "appointment_cancelled",
  "no_show",
  "new_review",
];

const DEFAULT_TYPE: TypeSetting = { in_app: true, sound: true, badge: true };

export function NotificationSettings() {
  const t = useTranslations("Notifications");
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);
  const [typeSettings, setTypeSettings] = useState<
    Partial<Record<NotificationType, TypeSetting>>
  >({});
  const [quietEnabled, setQuietEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState("23:00");
  const [quietEnd, setQuietEnd] = useState("07:00");

  useEffect(() => {
    getNotificationSettings().then((s) => {
      if (s) {
        setTypeSettings(s.type_settings ?? {});
        setQuietEnabled(s.quiet_hours_enabled);
        setQuietStart(s.quiet_hours_start.slice(0, 5));
        setQuietEnd(s.quiet_hours_end.slice(0, 5));
      }
      setLoaded(true);
    });
  }, []);

  function get(type: NotificationType): TypeSetting {
    return typeSettings[type] ?? DEFAULT_TYPE;
  }

  function setFlag(
    type: NotificationType,
    key: keyof TypeSetting,
    value: boolean,
  ) {
    setTypeSettings((prev) => ({
      ...prev,
      [type]: { ...get(type), [key]: value },
    }));
  }

  function save() {
    startTransition(async () => {
      // Persist a full map so unspecified types keep explicit defaults.
      const full: Partial<Record<NotificationType, TypeSetting>> = {};
      for (const type of NOTIFICATION_TYPES) full[type] = get(type);
      const res = await updateNotificationSettings({
        typeSettings: full,
        quietHoursEnabled: quietEnabled,
        quietHoursStart: quietStart,
        quietHoursEnd: quietEnd,
      });
      if (res.status === "success") toast.success(t("settings.saved"));
      else toast.error(t("settings.error"));
    });
  }

  if (!loaded) {
    return (
      <div className="h-40 animate-pulse rounded-2xl border border-line bg-paper" />
    );
  }

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-line bg-paper p-5">
      <div>
        <h2 className="font-display text-lg font-bold text-ink">
          {t("settings.title")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("settings.subtitle")}</p>
      </div>

      <div className="flex flex-col divide-y divide-line">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 pb-2 text-xs font-semibold text-muted">
          <span>{t("settings.typeLabel")}</span>
          <span className="w-14 text-center">{t("settings.inApp")}</span>
          <span className="w-14 text-center">{t("settings.sound")}</span>
        </div>
        {CONFIGURABLE.map((type) => {
          const cfg = get(type);
          return (
            <div
              key={type}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2.5 text-sm"
            >
              <span className="text-ink">{t(`types.${type}`)}</span>
              <span className="flex w-14 justify-center">
                <Toggle
                  checked={cfg.in_app}
                  onChange={(v) => setFlag(type, "in_app", v)}
                  label={t("settings.inApp")}
                />
              </span>
              <span className="flex w-14 justify-center">
                <Toggle
                  checked={cfg.sound}
                  disabled={!cfg.in_app}
                  onChange={(v) => setFlag(type, "sound", v)}
                  label={t("settings.sound")}
                />
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink">{t("settings.quietHours")}</span>
          <Toggle
            checked={quietEnabled}
            onChange={setQuietEnabled}
            label={t("settings.quietHours")}
          />
        </label>
        {quietEnabled && (
          <div className="flex items-center gap-3">
            <label className="flex flex-col gap-1 text-xs text-muted">
              {t("settings.from")}
              <input
                type="time"
                value={quietStart}
                onChange={(e) => setQuietStart(e.target.value)}
                className="rounded-lg border border-line bg-canvas px-2 py-1.5 text-sm text-ink"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              {t("settings.to")}
              <input
                type="time"
                value={quietEnd}
                onChange={(e) => setQuietEnd(e.target.value)}
                className="rounded-lg border border-line bg-canvas px-2 py-1.5 text-sm text-ink"
              />
            </label>
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-paper transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? t("settings.saving") : t("settings.save")}
        </button>
      </div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition-colors disabled:opacity-40 ${
        checked ? "bg-primary" : "bg-line"
      }`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-paper transition-all ${
          checked ? "end-0.5" : "start-0.5"
        }`}
      />
    </button>
  );
}
