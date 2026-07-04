"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatRelativeTime } from "@/lib/notifications/format";
import type { Notification, NotificationPriority } from "@/lib/notifications/types";
import { TypeIcon } from "./notification-icons";

const PRIORITY_TINT: Record<NotificationPriority, string> = {
  low: "bg-canvas",
  medium: "bg-canvas",
  high: "bg-saffron/10",
  urgent: "bg-brick/5",
};

export function NotificationItem({
  notification,
  onRead,
  onArchive,
  onClose,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onArchive: (id: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("Notifications");
  const locale = useLocale();
  const router = useRouter();
  const isUnread = notification.status === "unread";

  function activate() {
    if (isUnread) onRead(notification.id);
    if (notification.action_url) {
      onClose();
      router.push(notification.action_url);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      }}
      className={`relative flex cursor-pointer items-start gap-3 border-b border-line px-3 py-3 text-start transition-colors last:border-0 ${
        isUnread ? PRIORITY_TINT[notification.priority] : "hover:bg-canvas"
      }`}
    >
      {isUnread && (
        <span
          className="absolute end-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-s-full bg-saffron"
          aria-hidden
        />
      )}

      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
          isUnread ? "bg-paper text-ink shadow-sm" : "bg-canvas text-muted"
        }`}
      >
        <TypeIcon type={notification.type} />
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-5 ${
            isUnread ? "font-semibold text-ink" : "text-muted"
          }`}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted">
          {notification.message}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <time className="text-[11px] text-muted">
            {formatRelativeTime(notification.created_at, locale)}
          </time>
          {notification.priority === "urgent" && (
            <span className="rounded bg-brick/10 px-1.5 py-0.5 text-[10px] font-bold text-brick">
              {t("urgent")}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-1">
        {isUnread && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRead(notification.id);
            }}
            title={t("markRead")}
            aria-label={t("markRead")}
            className="rounded p-1 text-muted transition-colors hover:bg-line hover:text-ink"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onArchive(notification.id);
          }}
          title={t("archive")}
          aria-label={t("archive")}
          className="rounded p-1 text-muted transition-colors hover:bg-line hover:text-ink"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 6h18M5 6l1 14h12l1-14M9 10v6M15 10v6M9 6V4h6v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
