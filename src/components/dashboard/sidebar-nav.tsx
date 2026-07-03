"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

// Dashboard navigation, Calendly-style: a vertical rail inside the sidebar on
// desktop and a horizontal scrollable tab strip on mobile. Pure presentation —
// routes are fixed and the active state derives from the pathname. The sidebar
// sits at inline-start, so in RTL it lands on the right with no locale checks.

type NavItem = {
  href: string;
  labelKey: "overviewNav" | "appointmentsNav" | "servicesNav" | "providersNav" | "reviewsNav" | "settingsNav";
  icon: React.ReactNode;
  // Overview must match exactly, otherwise it stays lit on every subpage.
  exact?: boolean;
};

const PRIMARY_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "overviewNav", icon: <GridIcon />, exact: true },
  { href: "/dashboard/appointments", labelKey: "appointmentsNav", icon: <CalendarIcon /> },
  { href: "/dashboard/services", labelKey: "servicesNav", icon: <TagIcon /> },
  { href: "/dashboard/providers", labelKey: "providersNav", icon: <UsersIcon /> },
];

const SECONDARY_ITEMS: NavItem[] = [
  { href: "/dashboard/reviews", labelKey: "reviewsNav", icon: <StarIcon /> },
  { href: "/dashboard/settings", labelKey: "settingsNav", icon: <GearIcon /> },
];

export function SidebarNav({
  orientation,
}: {
  orientation: "vertical" | "horizontal";
}) {
  const t = useTranslations("Dashboard");
  const pathname = usePathname();

  function isActive(item: NavItem) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  if (orientation === "horizontal") {
    return (
      <nav
        aria-label={t("brand")}
        className="flex items-center gap-1 overflow-x-auto px-4 pb-0.5"
      >
        {[...PRIMARY_ITEMS, ...SECONDARY_ITEMS].map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "border-saffron font-semibold text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {item.icon}
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      aria-label={t("brand")}
      className="flex flex-1 flex-col gap-1 px-3 py-2"
    >
      {PRIMARY_ITEMS.map((item) => (
        <VerticalLink key={item.href} item={item} active={isActive(item)} label={t(item.labelKey)} />
      ))}
      <div className="mx-2 my-2 border-t border-line" role="presentation" />
      {SECONDARY_ITEMS.map((item) => (
        <VerticalLink key={item.href} item={item} active={isActive(item)} label={t(item.labelKey)} />
      ))}
    </nav>
  );
}

function VerticalLink({
  item,
  active,
  label,
}: {
  item: NavItem;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg border-s-[3px] px-3 py-2.5 text-sm transition-colors ${
        active
          ? "border-saffron bg-ink font-semibold text-paper"
          : "border-transparent text-muted hover:bg-canvas hover:text-ink"
      }`}
    >
      {item.icon}
      {label}
    </Link>
  );
}

/* Inline glyphs matched to the Daybook stroke weight (no icon dependency). */

function iconProps() {
  return {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  } as const;
}

function GridIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18" />
      <path d="M8 2v4M16 2v4" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M20.6 13.4 12 22 2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 5a3.5 3.5 0 0 1 0 6.6" />
      <path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg {...iconProps()}>
      <path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.2 9.4l6.1-.8L12 3Z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 .9-1.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5.9H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1Z" />
    </svg>
  );
}
