"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

// Visible language toggle. On the public booking page the browser language is
// detected automatically, but this switch is always available.
export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const activeLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(nextLocale: Locale) {
    // Re-render the current pathname under the chosen locale.
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full border border-line bg-paper p-0.5"
      aria-label={t("label")}
    >
      {routing.locales.map((locale) => {
        const isActive = locale === activeLocale;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => switchTo(locale)}
            aria-current={isActive ? "true" : undefined}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              isActive
                ? "bg-ink text-paper"
                : "text-muted hover:text-ink"
            }`}
          >
            {t(locale)}
          </button>
        );
      })}
    </div>
  );
}
