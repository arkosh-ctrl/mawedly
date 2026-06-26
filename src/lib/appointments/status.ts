// Single source of truth for appointment statuses, allowed transitions, and
// which statuses occupy a time slot. No status string is written literally
// anywhere else — import from here.

export const APPOINTMENT_STATUSES = [
  "pending_verification",
  "confirmed",
  "completed",
  "no_show",
  "canceled",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

// The status every new booking starts in.
export const INITIAL_APPOINTMENT_STATUS: AppointmentStatus =
  "pending_verification";

// Allowed manual transitions. Terminal states map to []. The action rejects any
// transition not listed here, and the UI derives which buttons to show from it.
export const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> =
  {
    pending_verification: ["confirmed", "canceled"],
    confirmed: ["completed", "no_show", "canceled"],
    completed: [],
    no_show: [],
    canceled: [],
  };

// Statuses that reserve the time slot — MUST mirror the DB EXCLUSION constraint
// (migration 0005: WHERE status in ('pending_verification','confirmed','completed')).
// canceled / no_show free the slot.
export const BLOCKING_STATUSES: AppointmentStatus[] = [
  "pending_verification",
  "confirmed",
  "completed",
];

export function isAppointmentStatus(value: unknown): value is AppointmentStatus {
  return (
    typeof value === "string" &&
    (APPOINTMENT_STATUSES as readonly string[]).includes(value)
  );
}
