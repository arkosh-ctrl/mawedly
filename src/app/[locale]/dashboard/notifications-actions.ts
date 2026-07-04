"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { withNotifications } from "@/lib/notifications/db";
import type {
  FetchNotificationsResult,
  Notification,
  NotificationSettings,
  NotificationStatus,
  NotificationType,
  TypeSetting,
} from "@/lib/notifications/types";

// Resolve the authenticated merchant's business id. All queries are additionally
// RLS-scoped, so this is both the filter and a defense-in-depth check.
async function currentBusinessId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) return null;
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return business?.id ?? null;
}

/** Fetch merchant notifications with pagination + unread count. */
export async function fetchNotifications(
  status: NotificationStatus | "all" = "all",
  page = 1,
  limit = 20,
): Promise<FetchNotificationsResult> {
  const base = await createClient();
  const supabase = withNotifications(base);
  const businessId = await currentBusinessId(base);
  if (!businessId) return { notifications: [], total: 0, unreadCount: 0 };

  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (status === "all") {
    query = query.in("status", ["unread", "read"]); // hide archived from the main list
  } else {
    query = query.eq("status", status);
  }

  const { data, count } = await query.range((page - 1) * limit, page * limit - 1);

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("status", "unread");

  return {
    notifications: (data as Notification[]) ?? [],
    total: count ?? 0,
    unreadCount: unreadCount ?? 0,
  };
}

/** Unread badge count only. */
export async function getUnreadCount(): Promise<number> {
  const base = await createClient();
  const supabase = withNotifications(base);
  const businessId = await currentBusinessId(base);
  if (!businessId) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("status", "unread");
  return count ?? 0;
}

export async function markAsRead(notificationId: string): Promise<void> {
  const base = await createClient();
  const supabase = withNotifications(base);
  const businessId = await currentBusinessId(base);
  if (!businessId) return;

  await supabase
    .from("notifications")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("business_id", businessId);
  revalidatePath("/dashboard");
}

export async function markAllAsRead(): Promise<void> {
  const base = await createClient();
  const supabase = withNotifications(base);
  const businessId = await currentBusinessId(base);
  if (!businessId) return;

  await supabase
    .from("notifications")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .eq("status", "unread");
  revalidatePath("/dashboard");
}

export async function archiveNotification(
  notificationId: string,
): Promise<void> {
  const base = await createClient();
  const supabase = withNotifications(base);
  const businessId = await currentBusinessId(base);
  if (!businessId) return;

  await supabase
    .from("notifications")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("business_id", businessId);
  revalidatePath("/dashboard");
}

/** Read (creating a default row if absent) the merchant's notification settings. */
export async function getNotificationSettings(): Promise<NotificationSettings | null> {
  const base = await createClient();
  const supabase = withNotifications(base);
  const businessId = await currentBusinessId(base);
  if (!businessId) return null;

  const { data } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  return (data as NotificationSettings) ?? null;
}

/** Upsert the merchant's notification settings (per-type + quiet hours). */
export async function updateNotificationSettings(input: {
  typeSettings?: Partial<Record<NotificationType, TypeSetting>>;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  maxVisible?: number;
}): Promise<{ status: "success" | "error" }> {
  const base = await createClient();
  const supabase = withNotifications(base);
  const businessId = await currentBusinessId(base);
  if (!businessId) return { status: "error" };

  const { error } = await supabase.from("notification_settings").upsert(
    {
      business_id: businessId,
      ...(input.typeSettings ? { type_settings: input.typeSettings } : {}),
      ...(input.quietHoursEnabled !== undefined
        ? { quiet_hours_enabled: input.quietHoursEnabled }
        : {}),
      ...(input.quietHoursStart ? { quiet_hours_start: input.quietHoursStart } : {}),
      ...(input.quietHoursEnd ? { quiet_hours_end: input.quietHoursEnd } : {}),
      ...(input.maxVisible !== undefined ? { max_visible: input.maxVisible } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id" },
  );

  if (error) return { status: "error" };
  revalidatePath("/dashboard/settings");
  return { status: "success" };
}
