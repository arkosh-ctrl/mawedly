import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

// Base URL for all absolute links. Strip any trailing slash so we can safely
// append "/<locale><path>" without producing double slashes.
const baseUrl = (
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

// Public marketing pages only. Protected routes (/dashboard, /login), the
// dynamic booking route (/[slug]), and API/auth endpoints are intentionally
// excluded. "" is the home page (served at /<locale>).
const marketingPaths = [
  "",
  "/how-it-works",
  "/pricing",
  "/about",
  "/contact",
  "/faq",
  "/privacy",
  "/terms",
] as const;

// The home page carries the highest priority; the rest are slightly lower.
function priorityFor(path: string): number {
  return path === "" ? 1 : 0.8;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return marketingPaths.flatMap((path) => {
    // hreflang alternates linking the ar/en versions of the same page. The URL
    // shape matches next-intl's localePrefix: "always", so /<locale><path>.
    const languages = Object.fromEntries(
      routing.locales.map((locale) => [locale, `${baseUrl}/${locale}${path}`]),
    ) as Record<(typeof routing.locales)[number], string>;

    return routing.locales.map((locale) => ({
      url: `${baseUrl}/${locale}${path}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: priorityFor(path),
      alternates: { languages },
    }));
  });
}
