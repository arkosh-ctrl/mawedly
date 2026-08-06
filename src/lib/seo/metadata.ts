import type { Metadata } from "next";
// Explicit .ts extension (tsconfig has allowImportingTsExtensions) so the
// Node-based test suite can import this module directly — Node's ESM resolver
// does not guess extensions. Same convention the tests/ files already use.
import { SITE_URL, type SeoLocale } from "./site.ts";

/**
 * ONE source of truth for every page-level metadata tag.
 *
 * WHY A HELPER AND NOT PER-PAGE OBJECTS
 * Next.js merges metadata SHALLOWLY, per top-level key. A page that exports
 * `openGraph` REPLACES the layout's `openGraph` wholesale — it does not merge
 * field by field. So a layout-level og:image is silently dropped by any page
 * that sets its own openGraph. The only safe shape is: every page emits the
 * COMPLETE object. That is what this file guarantees.
 *
 * `twitter` is a separate top-level key; Next does not derive it from
 * openGraph. If nothing sets it there are no Twitter Card tags at all.
 */

/** Absolute base for every URL in metadata. Resolves relative og images too. */
export const METADATA_BASE = new URL(SITE_URL);

/** Facebook-style og:locale codes. Next passes these through verbatim. */
const OG_LOCALE: Record<SeoLocale, string> = {
  ar: "ar_AR",
  en: "en_US",
};

/**
 * Pre-rendered social cards, one per language.
 *
 * These are STATIC files, not `next/og`. ImageResponse is powered by satori,
 * which has no RTL and no complex-script shaping: Arabic renders as unjoined
 * letters in reverse order, and feeding it a real Arabic font can fail the
 * build outright inside opentype.js. See scripts/generate-og.py.
 */
const OG_IMAGE: Record<SeoLocale, string> = {
  ar: "/og-ar.png",
  en: "/og-en.png",
};

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

function defaultImage(locale: SeoLocale, alt: string) {
  return {
    url: OG_IMAGE[locale],
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    alt,
  };
}

/**
 * THE list of paths that exist in BOTH locales.
 *
 * This is deliberately the only place that knowledge lives. Three things must
 * never drift apart — the hreflang pairs, the sitemap entries, and the language
 * switcher's target — so all three derive from here. Hand-maintaining them
 * separately is exactly how one side ends up disagreeing, and Google discards
 * one-directional hreflang WHOLESALE rather than partially.
 *
 * Adding a page here is what puts it in the sitemap. "" is the home page.
 */
export const LOCALIZED_PATHS = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/how-it-works", priority: 0.9, changeFrequency: "monthly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.9, changeFrequency: "weekly" },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.8, changeFrequency: "monthly" },

  // One page per vertical, not one page listing five. People search
  // "نظام حجز مواعيد للصالونات", not "booking system for service businesses" —
  // a page per intent matches the query, a combined page matches none of them.
  { path: "/use-cases/salons", priority: 0.9, changeFrequency: "monthly" },
  { path: "/use-cases/tutors", priority: 0.9, changeFrequency: "monthly" },
  { path: "/use-cases/consultants", priority: 0.9, changeFrequency: "monthly" },
  { path: "/use-cases/coaches", priority: 0.9, changeFrequency: "monthly" },
  {
    path: "/use-cases/professional-services",
    priority: 0.9,
    changeFrequency: "monthly",
  },

  // Comparison pages are cited heavily by AI answer engines and rank for
  // competitor terms. This one earns that only because it says plainly where
  // Mawedly is the WRONG choice — that is what makes a source worth re-citing.
  { path: "/alternatives/calendly", priority: 0.9, changeFrequency: "monthly" },

  // A free tool earns links a marketing page never will — people cite a
  // calculator, they do not cite a features list.
  { path: "/tools/no-show-calculator", priority: 0.8, changeFrequency: "yearly" },

  // Public, no-login demo. Most SaaS sites make you sign up before you can see
  // anything, which is exactly the friction this page removes.
  { path: "/demo", priority: 0.8, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.7, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.4, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.4, changeFrequency: "yearly" },
  { path: "/disclaimer", priority: 0.4, changeFrequency: "yearly" },
  { path: "/acceptable-use", priority: 0.4, changeFrequency: "yearly" },
  { path: "/dpa", priority: 0.4, changeFrequency: "yearly" },
] as const;

/**
 * Union of every path known to exist in both locales.
 *
 * `pageMetadata` accepts ONLY this type, so claiming an hreflang alternate for
 * a page that does not exist is a compile error rather than a live 404 — and
 * pointing hreflang at a 404 is worse than emitting none at all.
 */
export type LocalizedPath = (typeof LOCALIZED_PATHS)[number]["path"];

/** Absolute, canonical-host URL for a locale + path. */
export function absoluteUrl(locale: SeoLocale, path: string): string {
  return `${SITE_URL}/${locale}${path}`;
}

/**
 * hreflang map for a path available in both locales, including x-default.
 *
 * x-default points at Arabic: it is the primary market and the locale the
 * apex redirect lands on, so it is the honest "no language matched" answer.
 */
export function languageAlternates(path: LocalizedPath) {
  return {
    ar: absoluteUrl("ar", path),
    en: absoluteUrl("en", path),
    "x-default": absoluteUrl("ar", path),
  };
}

type BaseArgs = {
  locale: SeoLocale;
  title: string;
  description: string;
  /** Overrides the default per-locale social card (blog posts pass a cover). */
  image?: string;
  /** "article" for blog posts; everything else is a website. */
  ogType?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
};

/** Build the openGraph + twitter pair from one set of inputs, always complete. */
function socialTags(
  args: BaseArgs & { url: string },
): Pick<Metadata, "openGraph" | "twitter"> {
  const images = args.image
    ? [args.image]
    : [defaultImage(args.locale, args.title)];

  return {
    openGraph: {
      type: args.ogType ?? "website",
      title: args.title,
      description: args.description,
      url: args.url,
      siteName: args.locale === "ar" ? "موعدلي" : "Mawedly",
      locale: OG_LOCALE[args.locale],
      images,
      ...(args.publishedTime ? { publishedTime: args.publishedTime } : {}),
      ...(args.modifiedTime ? { modifiedTime: args.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: args.title,
      description: args.description,
      images,
    },
  };
}

/**
 * Metadata for a page that exists in BOTH locales.
 *
 * `path` is typed to LOCALIZED_PATHS, so the hreflang pair it emits is always
 * reciprocal by construction: /ar/pricing claims /en/pricing and /en/pricing
 * claims /ar/pricing, from the same call.
 */
export function pageMetadata(
  args: BaseArgs & { path: LocalizedPath },
): Metadata {
  const url = absoluteUrl(args.locale, args.path);
  return {
    metadataBase: METADATA_BASE,
    title: args.title,
    description: args.description,
    alternates: {
      canonical: url,
      languages: languageAlternates(args.path),
    },
    ...socialTags({ ...args, url }),
  };
}

/**
 * Metadata for a page whose translations are DATA-driven, not structural —
 * blog posts today, per-provider booking pages later.
 *
 * `availableLocales` must be the locales that actually resolve. A post that
 * exists only in Arabic must not advertise an English alternate.
 */
export function dynamicPageMetadata(
  args: BaseArgs & { path: string; availableLocales: readonly SeoLocale[] },
): Metadata {
  const url = `${SITE_URL}/${args.locale}${args.path}`;

  const languages = Object.fromEntries(
    args.availableLocales.map((l) => [l, `${SITE_URL}/${l}${args.path}`]),
  );
  // x-default only makes sense once Arabic is actually one of the options.
  if (args.availableLocales.includes("ar")) {
    languages["x-default"] = `${SITE_URL}/ar${args.path}`;
  }

  return {
    metadataBase: METADATA_BASE,
    title: args.title,
    description: args.description,
    alternates: { canonical: url, languages },
    ...socialTags({ ...args, url }),
  };
}

/**
 * Metadata for a page that may be FETCHED but must never RANK.
 *
 * Disallow and noindex cancel each other out: a page blocked in robots.txt is
 * never crawled, so the noindex on it is never read — and if anything links to
 * it, Google can still list the bare URL with no way to remove it. Login and
 * signup are "crawlable but not indexable", which is this, not Disallow.
 *
 * follow: true so link equity still flows out to the public pages they link to.
 */
export function noindexMetadata(title: string, description?: string): Metadata {
  return {
    metadataBase: METADATA_BASE,
    title,
    ...(description ? { description } : {}),
    robots: { index: false, follow: true },
  };
}
