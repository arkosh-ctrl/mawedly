"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { LocalizedPath } from "@/lib/seo/metadata";

// Public marketing footer: brand tagline + grouped links + rights line.
const PRODUCT_LINKS = [
  { href: "/how-it-works", key: "howItWorks" },
  { href: "/pricing", key: "pricing" },
  { href: "/demo", key: "demo" },
  { href: "/faq", key: "faq" },
] as const;

const COMPANY_LINKS = [
  { href: "/about", key: "about" },
  { href: "/blog", key: "blog" },
  { href: "/contact", key: "contact" },
] as const;

// The vertical landing pages. Listed here so every page on the site links to
// them: a page reachable only from the sitemap is discovered far more slowly and
// carries none of the internal link equity the rest of the site has earned.
const VERTICALS = [
  "salons",
  "tutors",
  "consultants",
  "coaches",
  "professional-services",
] as const;

export function SiteFooter() {
  const tNav = useTranslations("Nav");
  const tFooter = useTranslations("Footer");
  const tUseCases = useTranslations("UseCases");

  return (
    <footer className="border-t border-pine/40 bg-ink text-paper">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 py-14 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <div className="flex flex-col gap-3">
          <span className="font-display text-xl font-extrabold tracking-tight text-paper">
            {tNav("brand")}
          </span>
          <p className="max-w-xs text-sm leading-relaxed text-sage">
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

        <FooterCol title={tFooter("industries")}>
          {VERTICALS.map((v) => (
            <FooterLink key={v} href={`/use-cases/${v}`}>
              {tUseCases(`verticals.${v}.navLabel`)}
            </FooterLink>
          ))}
          <FooterLink href="/alternatives/calendly">
            {tFooter("compareCalendly")}
          </FooterLink>
          <FooterLink href="/tools/no-show-calculator">
            {tFooter("noShowTool")}
          </FooterLink>
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
          <FooterLink href="/disclaimer">{tFooter("disclaimer")}</FooterLink>
          <FooterLink href="/acceptable-use">{tFooter("acceptableUse")}</FooterLink>
          <FooterLink href="/dpa">{tFooter("dpa")}</FooterLink>
        </FooterCol>
      </div>

      <div className="border-t border-pine/40">
        <div className="mx-auto max-w-6xl px-5 py-5 font-mono text-xs text-sage">
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
      <span className="eyebrow text-sage">{title}</span>
      <ul className="flex flex-col gap-2">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  // LocalizedPath, not a hand-written union. This prop used to list every path
  // literally — a fourth copy of "which pages exist", alongside LOCALIZED_PATHS,
  // the sitemap and the nav. Typing it against the single source means adding a
  // page here without adding it there is a compile error, and a footer link can
  // never point at a page with no hreflang or sitemap entry.
  href: LocalizedPath;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-sage transition-colors hover:text-paper"
      >
        {children}
      </Link>
    </li>
  );
}
