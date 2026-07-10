"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { NotificationTab } from "./use-notifications";
import type { Notification } from "@/lib/notifications/types";
import { NotificationList } from "./notification-list";

const TABS: NotificationTab[] = ["all", "unread", "archived"];

export function NotificationDropdown({
  items,
  loading,
  tab,
  unreadCount,
  onTab,
  onRead,
  onArchive,
  onMarkAll,
  onClose,
}: {
  items: Notification[];
  loading: boolean;
  tab: NotificationTab;
  unreadCount: number;
  onTab: (tab: NotificationTab) => void;
  onRead: (id: string) => void;
  onArchive: (id: string) => void;
  onMarkAll: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("Notifications");

  return (
    <div
      // Mobile: full-width fixed sheet under the top bar. Desktop (lg+): anchored
      // to the bell, opening from its START edge so the panel grows toward the
      // page content — in RTL the sidebar sits on the right, so `end-0` used to
      // push the 360px panel off-screen and clip every notification.
      className="fixed inset-x-3 top-20 z-50 overflow-hidden rounded-2xl border border-line bg-paper shadow-lg lg:absolute lg:inset-x-auto lg:start-0 lg:top-[calc(100%+8px)] lg:w-[360px]"
      role="dialog"
      aria-label={t("title")}
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h3 className="font-display text-base font-bold text-ink">
          {t("title")}
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMarkAll}
            disabled={unreadCount === 0}
            className="text-xs text-pine transition-colors hover:text-ink disabled:opacity-40"
          >
            {t("markAll")}
          </button>
          <Link
            href="/dashboard/settings"
            onClick={onClose}
            className="text-xs text-muted transition-colors hover:text-ink"
          >
            {t("settingsLink")}
          </Link>
        </div>
      </div>

      <div className="flex gap-1 border-b border-line px-2 py-2">
        {TABS.map((tb) => (
          <button
            key={tb}
            type="button"
            onClick={() => onTab(tb)}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              tab === tb
                ? "bg-ink font-semibold text-paper"
                : "text-muted hover:text-ink"
            }`}
          >
            {t(`tabs.${tb}`)}
            {tb === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
          </button>
        ))}
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        <NotificationList
          items={items}
          loading={loading}
          onRead={onRead}
          onArchive={onArchive}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
