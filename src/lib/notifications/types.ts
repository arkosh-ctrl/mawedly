// Domain types for the merchant notification center (migration 0013).

export const NOTIFICATION_TYPES = [
  "new_booking",
  "reminder_1h",
  "reminder_30m",
  "reminder_15m",
  "new_chat_message",
  "appointment_cancelled",
  "appointment_rescheduled",
  "appointment_completed",
  "no_show",
  "payment_received",
  "payment_failed",
  "new_review",
  "system_announcement",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationSourceType =
  | "appointment"
  | "chat_message"
  | "payment"
  | "review"
  | "system";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";
export type NotificationStatus = "unread" | "read" | "archived";
export type NotificationActionType = "navigate" | "open_chat" | "open_review";

export type Notification = {
  id: string;
  business_id: string;
  source_type: NotificationSourceType;
  source_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  action_url: string | null;
  action_type: NotificationActionType | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
};

export type TypeSetting = { in_app: boolean; sound: boolean; badge: boolean };

export type NotificationSettings = {
  id: string;
  business_id: string;
  type_settings: Partial<Record<NotificationType, TypeSetting>>;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // HH:MM[:SS]
  quiet_hours_end: string;
  max_visible: number;
  created_at: string;
  updated_at: string;
};

// Payload accepted by createNotification. business_id is the OWNER business,
// resolved by the caller (it always has it in hand at the integration points).
export type CreateNotificationInput = {
  businessId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  sourceType: NotificationSourceType;
  sourceId?: string | null;
  actionUrl?: string | null;
  actionType?: NotificationActionType | null;
  metadata?: Record<string, unknown>;
};

export type FetchNotificationsResult = {
  notifications: Notification[];
  total: number;
  unreadCount: number;
};
