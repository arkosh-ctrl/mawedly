import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getPublishedSlugs } from "@/lib/blog/queries";

// Revalidated on the same cadence as the blog pages. Without this the sitemap
// is frozen at build time and a post published afterwards never appears in it.
export const revalidate = 300;

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
  "/blog",
  "/privacy",
  "/terms",
] as const;

// The home page carries the highest priority; the rest are slightly lower.
function priorityFor(path: string): number {
  if (path === "") return 1;
  return path === "/blog" ? 0.9 : 0.8;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticEntries = marketingPaths.flatMap((path) => {
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

  // One entry per (post, locale that actually has a translation). A post only
  // appears once its published_at has passed — the same rule the RLS policy
  // applies, so the sitemap can never advertise an unpublished URL.
  const posts = await getPublishedSlugs();
  const postEntries = !posts.ok
    ? []
    : posts.data.flatMap((entry) => {
        const languages = Object.fromEntries(
          entry.locales.map((locale) => [
            locale,
            `${baseUrl}/${locale}/blog/${entry.slug}`,
          ]),
        );

        return entry.locales.map((locale) => ({
          url: `${baseUrl}/${locale}/blog/${entry.slug}`,
          lastModified: new Date(entry.updated_at),
          changeFrequency: "monthly" as const,
          priority: 0.7,
          alternates: { languages },
        }));
      });

  return [...staticEntries, ...postEntries];
}
