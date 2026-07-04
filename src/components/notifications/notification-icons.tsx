import type { NotificationType } from "@/lib/notifications/types";

// Inline SVGs matched to the sidebar-nav stroke style (no icon dependency).

function base() {
  return {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  } as const;
}

export function BellIcon({ className }: { className?: string }) {
  return (
    <svg {...base()} className={className}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function CalendarPlus() {
  return (
    <svg {...base()}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4M12 13v4M10 15h4" />
    </svg>
  );
}
function Clock() {
  return (
    <svg {...base()}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function Message() {
  return (
    <svg {...base()}>
      <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5Z" />
    </svg>
  );
}
function XCircle() {
  return (
    <svg {...base()}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  );
}
function CalendarSwap() {
  return (
    <svg {...base()}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4M9 15l-2-2 2-2M15 13l2 2-2 2M7 13h10" />
    </svg>
  );
}
function CheckCircle() {
  return (
    <svg {...base()}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
  );
}
function UserX() {
  return (
    <svg {...base()}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20a6 6 0 0 1 11 0M16 8l4 4M20 8l-4 4" />
    </svg>
  );
}
function Money() {
  return (
    <svg {...base()}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M14.5 9.3A2.4 2.4 0 0 0 12 8c-1.3 0-2.4.8-2.4 1.9 0 2.6 4.8 1.4 4.8 4 0 1.1-1.1 1.9-2.4 1.9a2.4 2.4 0 0 1-2.5-1.3" />
    </svg>
  );
}
function Star() {
  return (
    <svg {...base()}>
      <path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.2 9.4l6.1-.8L12 3Z" />
    </svg>
  );
}
function Info() {
  return (
    <svg {...base()}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

const ICONS: Record<NotificationType, () => React.ReactNode> = {
  new_booking: CalendarPlus,
  reminder_1h: Clock,
  reminder_30m: Clock,
  reminder_15m: Clock,
  new_chat_message: Message,
  appointment_cancelled: XCircle,
  appointment_rescheduled: CalendarSwap,
  appointment_completed: CheckCircle,
  no_show: UserX,
  payment_received: Money,
  payment_failed: Money,
  new_review: Star,
  system_announcement: Info,
};

export function TypeIcon({ type }: { type: NotificationType }) {
  const Cmp = ICONS[type] ?? Info;
  return <Cmp />;
}
