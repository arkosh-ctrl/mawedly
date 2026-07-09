export type AdminRole = "admin" | "viewer";

export type AdminSession = {
  userId: string;
  role: AdminRole;
};

export type SystemEventLevel = "info" | "warn" | "error";

export type SystemEventScope =
  | "email"
  | "cron_reminders"
  | "booking_api"
  | "notifications"
  | "video"
  | "calendar"
  | "deposit"
  | "system";

export type SystemEvent = {
  id: string;
  scope: string;
  event: string;
  level: SystemEventLevel;
  meta: Record<string, unknown>;
  business_id: string | null;
  created_at: string;
};
