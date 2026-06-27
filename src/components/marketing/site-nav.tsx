"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";

// Public marketing navbar. Client component for the mobile menu toggle. Uses the
// locale-aware Link so the active locale is preserved across navigation.
const NAV_LINKS = [
  { href: "/", key: "home" },
  { href: "/how-it-works", key: "howItWorks" },
  { href: "/pricing", key: "pricing" },
  { href: "/about", key: "about" },
  { href: "/faq", key: "faq" },
  { href: "/contact", key: "contact" },
] as const;

export function SiteNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-neutral-900"
          onClick={() => setOpen(false)}
        >
          {t("brand")}
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.key}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "text-emerald-700"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {t(l.key)}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <LocaleSwitcher />
          <Link
            href="/login"
            className="rounded-full px-3 py-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-900"
          >
            {t("login")}
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            {t("cta")}
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label={open ? t("closeMenu") : t("openMenu")}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex size-9 items-center justify-center rounded-md border border-neutral-300 md:hidden"
        >
          <span className="text-lg leading-none">{open ? "✕" : "☰"}</span>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-neutral-200 bg-white md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.key}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
              >
                {t(l.key)}
              </Link>
            ))}
            <div className="my-2 h-px bg-neutral-200" />
            <div className="flex items-center justify-between">
              <LocaleSwitcher />
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-1.5 text-sm font-semibold text-white"
              >
                {t("cta")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
