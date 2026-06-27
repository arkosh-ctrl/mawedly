"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Public marketing footer: brand tagline + grouped links + rights line.
const PRODUCT_LINKS = [
  { href: "/how-it-works", key: "howItWorks" },
  { href: "/pricing", key: "pricing" },
  { href: "/faq", key: "faq" },
] as const;

const COMPANY_LINKS = [
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
] as const;

export function SiteFooter() {
  const tNav = useTranslations("Nav");
  const tFooter = useTranslations("Footer");

  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div className="flex flex-col gap-3">
          <span className="text-lg font-bold tracking-tight text-neutral-900">
            {tNav("brand")}
          </span>
          <p className="max-w-xs text-sm leading-relaxed text-neutral-600">
            {tFooter("tagline")}
          </p>
        </div>

        <FooterCol title={tFooter("product")}>
          {PRODUCT_LINKS.map((l) => (
            <FooterLink key={l.key} href={l.href}>
              {tNav(l.key)}
            </FooterLink>
          ))}
        </FooterCol>

        <FooterCol title={tFooter("company")}>
          {COMPANY_LINKS.map((l) => (
            <FooterLink key={l.key} href={l.href}>
              {tNav(l.key)}
            </FooterLink>
          ))}
        </FooterCol>

        <FooterCol title={tFooter("legal")}>
          <FooterLink href="/privacy">{tFooter("privacy")}</FooterLink>
          <FooterLink href="/terms">{tFooter("terms")}</FooterLink>
        </FooterCol>
      </div>

      <div className="border-t border-neutral-200">
        <div className="mx-auto max-w-6xl px-5 py-5 text-xs text-neutral-500">
          {tFooter("rights")}
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-semibold text-neutral-900">{title}</span>
      <ul className="flex flex-col gap-2">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: "/how-it-works" | "/pricing" | "/faq" | "/about" | "/contact" | "/privacy" | "/terms";
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-neutral-600 transition-colors hover:text-emerald-700"
      >
        {children}
      </Link>
    </li>
  );
}
