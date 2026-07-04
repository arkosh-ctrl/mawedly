"use client";

import { useTranslations } from "next-intl";
import { groupByDate, type DateGroupKey } from "@/lib/notifications/format";
import type { Notification } from "@/lib/notifications/types";
import { BellIcon } from "./notification-icons";
import { NotificationItem } from "./notification-item";

const GROUP_LABEL: Record<DateGroupKey, string> = {
  today: "groups.today",
  yesterday: "groups.yesterday",
  thisWeek: "groups.thisWeek",
  older: "groups.older",
};

export function NotificationList({
  items,
  loading,
  onRead,
  onArchive,
  onClose,
}: {
  items: Notification[];
  loading: boolean;
  onRead: (id: string) => void;
  onArchive: (id: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("Notifications");

  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="size-9 shrink-0 animate-pulse rounded-full bg-canvas" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 w-2/3 animate-pulse rounded bg-canvas" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-canvas" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
        <BellIcon className="size-10 text-line" />
        <p className="text-sm text-muted">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div>
      {groupByDate(items).map(([key, group]) => (
        <section key={key}>
          <h4 className="bg-canvas/60 px-3 py-1.5 text-[11px] font-semibold text-muted">
            {t(GROUP_LABEL[key])}
          </h4>
          {group.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onRead={onRead}
              onArchive={onArchive}
              onClose={onClose}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
