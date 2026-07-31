import type { BlogLocale } from "./types";

/**
 * Canonical origin for every absolute blog URL (canonical, hreflang, JSON-LD,
 * sitemap). mawedly.com is the canonical domain; NEXT_PUBLIC_APP_URL is allowed
 * to override it so preview deployments describe themselves correctly.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://mawedly.com"
).replace(/\/+$/, "");

/** Locale-relative path — next-intl's <Link> adds the /<locale> prefix. */
export function blogUrl(slug?: string): string {
  return slug ? `/blog/${slug}` : "/blog";
}

/** Absolute URL including the locale segment (localePrefix: "always"). */
export function absoluteBlogUrl(locale: BlogLocale, slug?: string): string {
  return `${SITE_URL}/${locale}${blogUrl(slug)}`;
}

const DATE_LOCALE: Record<BlogLocale, string> = {
  ar: "ar",
  en: "en-GB",
};

/**
 * Gulf-facing date. Arabic uses Latin digits (numberingSystem "latn") to match
 * the rest of the app, which renders times and prices in tabular Latin figures.
 */
export function formatBlogDate(iso: string, locale: BlogLocale): string {
  return new Intl.DateTimeFormat(
    `${DATE_LOCALE[locale]}-u-nu-latn-ca-gregory`,
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Riyadh",
    },
  ).format(new Date(iso));
}
