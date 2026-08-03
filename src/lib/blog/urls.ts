import type { BlogLocale } from "./types";

// Re-exported so blog code keeps importing the origin from one place, while the
// value itself lives with the other site-wide entity constants.
export { SITE_URL } from "@/lib/seo/site";

import { SITE_URL } from "@/lib/seo/site";

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
