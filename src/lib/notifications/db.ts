import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type {
  Notification,
  NotificationSettings,
  NotificationType,
  TypeSetting,
} from "./types";

// The hand-written Database type doesn't know the 0013 tables. Following the
// exact pattern once established for chat_messages (feature since retired): the
// table row/insert/update shapes are declared here and merged into the client
// generic locally, so the original tables stay fully typed and no shared file
// changes. Follow-up: fold notifications + notification_settings into
// database.types.ts alongside booking_attempts / reviews / chat_messages.

type NotificationInsert = {
  id?: string;
  business_id: string;
  source_type: Notification["source_type"];
  source_id?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  priority?: Notification["priority"];
  status?: Notification["status"];
  action_url?: string | null;
  action_type?: Notification["action_type"];
  metadata?: Record<string, unknown>;
  read_at?: string | null;
  archived_at?: string | null;
  created_at?: string;
};

type NotificationUpdate = {
  status?: Notification["status"];
  read_at?: string | null;
  archived_at?: string | null;
};

type SettingsInsert = {
  id?: string;
  business_id: string;
  type_settings?: Partial<Record<NotificationType, TypeSetting>>;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  max_visible?: number;
  created_at?: string;
  updated_at?: string;
};

export type NotificationsDatabase = {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      notifications: {
        Row: Notification;
        Insert: NotificationInsert;
        Update: NotificationUpdate;
        Relationships: [];
      };
      notification_settings: {
        Row: NotificationSettings;
        Insert: SettingsInsert;
        Update: Partial<SettingsInsert>;
        Relationships: [];
      };
    };
  };
};

export type NotificationsClient = SupabaseClient<NotificationsDatabase>;

/** Re-type an existing client so it knows the notification tables. */
export function withNotifications(
  client: SupabaseClient<Database>,
): NotificationsClient {
  return client as unknown as NotificationsClient;
}
