"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Visible language toggle. On the public booking page the browser language is
 * detected automatically, but this switch is always available.
 *
 * THESE MUST BE LINKS, NOT BUTTONS. Crawlers discover URLs by following <a>
 * elements. This used to be a <button> calling router.replace(), which creates
 * no link at all — so on a site where each language has its own URL, there was
 * no crawlable path from /ar/* to /en/* anywhere on the site. English was
 * reachable only through the sitemap, a far weaker signal than an in-page link,
 * and every hreflang pair pointed at a page with no crawl route to it.
 *
 * usePathname() from @/i18n/navigation returns the path WITHOUT the locale
 * prefix, and <Link locale> re-prefixes it — so /ar/pricing links to
 * /en/pricing and back, from this one component.
 */
export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const activeLocale = useLocale();
  const pathname = usePathname();

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full border border-line bg-paper p-0.5"
      aria-label={t("label")}
    >
      {routing.locales.map((locale: Locale) => {
        const isActive = locale === activeLocale;
        return (
          <Link
            key={locale}
            href={pathname}
            locale={locale}
            // Tells a crawler what it will get before it follows the link.
            hrefLang={locale}
            aria-current={isActive ? "true" : undefined}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              isActive ? "bg-ink text-paper" : "text-muted hover:text-ink"
            }`}
          >
            {t(locale)}
          </Link>
        );
      })}
    </div>
  );
}
