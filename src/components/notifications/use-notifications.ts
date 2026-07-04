"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { playNotificationSound } from "@/lib/notifications/sound";
import {
  archiveNotification,
  fetchNotifications,
  getNotificationSettings,
  markAllAsRead,
  markAsRead,
} from "@/app/[locale]/dashboard/notifications-actions";
import type {
  Notification,
  NotificationSettings,
  NotificationStatus,
} from "@/lib/notifications/types";

export type NotificationTab = "all" | "unread" | "archived";

function tabToStatus(tab: NotificationTab): NotificationStatus | "all" {
  return tab === "all" ? "all" : tab;
}

/**
 * Owns the bell's state: the unread badge (always live via Realtime), plus the
 * currently-shown list for the open dropdown tab. New rows arrive through a
 * Supabase Realtime INSERT subscription scoped to this business.
 */
export function useNotifications(businessId: string) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tab, setTab] = useState<NotificationTab>("all");
  const [loading, setLoading] = useState(false);
  const settingsRef = useRef<NotificationSettings | null>(null);

  // Load settings once for client-side sound gating (quiet hours are already
  // applied server-side by downgrading priority to 'low').
  useEffect(() => {
    getNotificationSettings().then((s) => {
      settingsRef.current = s;
    });
  }, []);

  const load = useCallback(async (which: NotificationTab) => {
    setLoading(true);
    try {
      const res = await fetchNotifications(tabToStatus(which), 1, 30);
      setItems(res.notifications);
      setUnreadCount(res.unreadCount);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial badge count (list loads lazily when the dropdown opens).
  useEffect(() => {
    fetchNotifications("all", 1, 1).then((r) => setUnreadCount(r.unreadCount));
  }, []);

  // Realtime subscription — new notifications for this business.
  useEffect(() => {
    if (!businessId) return;
    const supabase = createClient();
    // Unique channel name per mount: React StrictMode (dev) mounts effects
    // twice, and reusing a channel name would try to add listeners to an
    // already-subscribed channel ("cannot add postgres_changes ... after
    // subscribe()"). A fresh name each mount sidesteps that entirely.
    const channelName = `notifications:${businessId}:${
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)
    }`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          setUnreadCount((c) => c + 1);
          setItems((prev) => {
            // Only prepend into the list if the current tab would show it.
            if (tab === "archived") return prev;
            return [n, ...prev];
          });

          const soundOn =
            settingsRef.current?.type_settings?.[n.type]?.sound !== false;
          if (soundOn && (n.priority === "high" || n.priority === "urgent")) {
            playNotificationSound();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // `tab` is intentionally read via closure; re-subscribing on tab change is
    // unnecessary and would drop events during the swap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const changeTab = useCallback(
    (next: NotificationTab) => {
      setTab(next);
      load(next);
    },
    [load],
  );

  const onRead = useCallback(async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "read" } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await markAsRead(id);
  }, []);

  const onArchive = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await archiveNotification(id);
  }, []);

  const onMarkAll = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, status: "read" as const })));
    setUnreadCount(0);
    await markAllAsRead();
  }, []);

  return {
    items,
    unreadCount,
    tab,
    loading,
    load,
    changeTab,
    onRead,
    onArchive,
    onMarkAll,
  };
}
