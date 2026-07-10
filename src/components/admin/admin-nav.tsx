"use client";

import { Link, usePathname } from "@/i18n/navigation";

const ITEMS = [
  { href: "/admin", label: "نظرة عامة", exact: true },
  { href: "/admin/businesses", label: "الأنشطة" },
  { href: "/admin/contacts", label: "المشتركون" },
  { href: "/admin/appointments", label: "المواعيد" },
  { href: "/admin/health", label: "صحة الأنظمة" },
  { href: "/admin/audit", label: "سجل التدقيق" },
];

export function AdminNav() {
  const pathname = usePathname();

  function active(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <nav className="flex flex-wrap items-center gap-1">
      {ITEMS.map((item) => {
        const on = active(item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              on
                ? "bg-primary-light font-semibold text-primary"
                : "text-muted hover:bg-canvas hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
