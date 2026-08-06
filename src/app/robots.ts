import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

/**
 * DISALLOW vs NOINDEX — they are not interchangeable, and applying both to the
 * same path is self-defeating.
 *
 *   Disallow → "never fetch this". The crawler never sees the page, so it can
 *              never read a noindex on it. If anything links to the URL, Google
 *              can still list it as a bare result you now cannot remove.
 *   noindex  → "fetch it, just never rank it". Requires the page to be
 *              crawlable.
 *
 * So Disallow is for paths with nothing to crawl (API handlers) or that sit
 * behind auth and only ever answer with a redirect (dashboard, admin).
 * Login and signup are real, linkable destinations: they carry
 * robots: { index: false, follow: true } in their own metadata instead, and are
 * deliberately ABSENT from this list. Do not add them back.
 */
// Locale-prefixed (localePrefix: "always"), so both locales are listed.
const PROTECTED = [
  "/ar/dashboard",
  "/en/dashboard",
  "/ar/admin",
  "/en/admin",
  "/api/",
];

/**
 * Answer-engine crawlers, listed EXPLICITLY.
 *
 * They are already permitted by the wildcard rule, so these entries change
 * nothing technically. They exist as a decision record: being cited inside
 * ChatGPT, Perplexity, Claude and Google's AI answers is a goal here, and the
 * usual reflex is to block these agents by default. Naming them means blocking
 * one later has to be a deliberate edit rather than a side effect of someone
 * pasting a "block AI scrapers" snippet.
 *
 * NOTE: robots.txt is not the only place this can be undone. A CDN or WAF rule
 * that blocks these user agents overrides everything here, and there is no way
 * to detect that from inside the app — verify at the edge as well.
 */
const AI_CRAWLERS = [
  "GPTBot", // OpenAI — ChatGPT browsing and training
  "OAI-SearchBot", // OpenAI — ChatGPT search results
  "PerplexityBot",
  "ClaudeBot", // Anthropic
  "Claude-SearchBot",
  "Google-Extended", // Gemini / AI Overviews grounding
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PROTECTED,
      },
      {
        userAgent: AI_CRAWLERS,
        allow: "/",
        // Same protected set: an answer engine has no more business in the
        // dashboard than a search engine does.
        disallow: PROTECTED,
      },
    ],
    // Absolute, on the canonical www host. SITE_URL is the single source for
    // the origin; this file used to keep its own copy with a localhost default,
    // which would have shipped a localhost sitemap URL if the env var was ever
    // unset in a deploy.
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
