"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useNotifications } from "./use-notifications";
import { BellIcon } from "./notification-icons";
import { NotificationDropdown } from "./notification-dropdown";

/**
 * Header bell: live unread badge (Realtime) + dropdown. `businessId` is resolved
 * server-side in the dashboard layout so the client never queries for it.
 */
export function NotificationBell({ businessId }: { businessId: string }) {
  const t = useTranslations("Notifications");
  const [open, setOpen] = useState(false);
  const [ringing, setRinging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    items,
    unreadCount,
    tab,
    loading,
    load,
    changeTab,
    onRead,
    onArchive,
    onMarkAll,
  } = useNotifications(businessId);

  // Load the current tab's list the first time the dropdown opens.
  useEffect(() => {
    if (open) load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Brief ring animation whenever the unread count increases.
  const prevCount = useRef(unreadCount);
  useEffect(() => {
    if (unreadCount > prevCount.current) {
      setRinging(true);
      const id = setTimeout(() => setRinging(false), 1000);
      prevCount.current = unreadCount;
      return () => clearTimeout(id);
    }
    prevCount.current = unreadCount;
  }, [unreadCount]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("title")}
        aria-expanded={open}
        className="relative rounded-full p-2 text-ink transition-colors hover:bg-canvas"
      >
        <BellIcon
          className={ringing ? "size-5 animate-notif-ring" : "size-5"}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brick px-1 text-[10px] font-bold text-paper">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
          items={items}
          loading={loading}
          tab={tab}
          unreadCount={unreadCount}
          onTab={changeTab}
          onRead={onRead}
          onArchive={onArchive}
          onMarkAll={onMarkAll}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
