import type { AppointmentStatus } from "@/lib/appointments/status";

/** Row shape returned by the appointments page query (embeds resolved via FKs). */
export type AppointmentRow = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  deposit_verified: boolean | null;
  deposit_screenshot_path: string | null;
  customer_notes: string | null;
  customers: { name: string; phone: string } | null;
  services: {
    name: string;
    price: number;
    deposit_amount: number;
    session_type: string | null;
  } | null;
  providers: { name: string } | null;
  // Present (non-empty) once a review exists for this appointment.
  reviews: { id: string }[] | null;
};

// Badge classes per status, reusing the existing design tokens (ink = deep
// green, saffron = gold, pine, brick). Shared by every view.
export const STATUS_BADGE: Record<AppointmentStatus, string> = {
  pending_verification: "bg-saffron/15 text-pine border-saffron/45",
  confirmed: "bg-ink text-paper border-ink",
  completed: "bg-pine/10 text-pine border-pine/35",
  no_show: "bg-canvas text-muted border-line",
  canceled: "bg-brick/10 text-brick border-brick/35",
};

// Solid dot color per status — used by the calendar density dots.
export const STATUS_DOT: Record<AppointmentStatus, string> = {
  pending_verification: "bg-saffron",
  confirmed: "bg-ink",
  completed: "bg-pine",
  no_show: "bg-muted",
  canceled: "bg-brick",
};

export function hhmm(time: string) {
  return time.slice(0, 5);
}

/**
 * Callbacks + state the views need from the container. Keeping business logic
 * (status transitions, deposit, chat) in the container preserves the clean
 * split between logic and presentation.
 */
export type AppointmentActions = {
  isPending: boolean;
  receiptUrls: Record<string, string>;
  changeStatus: (id: string, status: AppointmentStatus) => void;
  toggleDeposit: (id: string, verified: boolean) => void;
  copyReviewLink: (id: string) => void;
  requestCancel: (row: AppointmentRow) => void;
  requestReschedule: (row: AppointmentRow) => void;
  openChat: (row: AppointmentRow) => void;
};
