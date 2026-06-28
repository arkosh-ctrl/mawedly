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
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link
          href="/"
          className="font-display text-xl font-extrabold tracking-tight text-ink"
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
                aria-current={active ? "page" : undefined}
                className={`relative rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "text-ink after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:bg-saffron after:content-['']"
                    : "text-muted hover:text-ink"
                }`}
              >
                {t(l.key)}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <LocaleSwitcher />
          <Link
            href="/login"
            className="px-2 py-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            {t("login")}
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-paper transition-colors hover:bg-pine"
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
          className="inline-flex size-9 items-center justify-center rounded-md border border-line text-ink md:hidden"
        >
          <span className="text-lg leading-none">{open ? "✕" : "☰"}</span>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-line bg-canvas md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.key}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2 text-sm text-pine hover:bg-paper"
              >
                {t(l.key)}
              </Link>
            ))}
            <div className="my-2 h-px bg-line" />
            <div className="flex items-center justify-between">
              <LocaleSwitcher />
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-paper"
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
