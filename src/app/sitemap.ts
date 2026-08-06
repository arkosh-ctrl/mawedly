import type { MetadataRoute } from "next";
import { getPublishedSlugs } from "@/lib/blog/queries";
import { SITE_URL } from "@/lib/seo/site";
import {
  LOCALIZED_PATHS,
  absoluteUrl,
  languageAlternates,
} from "@/lib/seo/metadata";

// Revalidated on the same cadence as the blog pages. Without this the sitemap
// is frozen at build time and a post published afterwards never appears in it.
export const revalidate = 300;

/**
 * The static half of this file reads LOCALIZED_PATHS — the same list the
 * hreflang tags come from. It used to keep its own parallel copy of "which
 * pages exist", which is how a page ends up in the sitemap with no hreflang, or
 * with hreflang and no sitemap entry. One list, one truth.
 *
 * Protected routes (/dashboard, /admin), the auth pages, the dynamic booking
 * route (/[slug]) and the API endpoints are absent by construction: they are
 * not in LOCALIZED_PATHS.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticEntries = LOCALIZED_PATHS.flatMap((entry) => {
    // Both locales share ONE alternates map, so the pair is reciprocal by
    // construction rather than by review.
    const languages = languageAlternates(entry.path);

    return (["ar", "en"] as const).map((locale) => ({
      url: absoluteUrl(locale, entry.path),
      lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
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
            `${SITE_URL}/${locale}/blog/${entry.slug}`,
          ]),
        );

        return entry.locales.map((locale) => ({
          url: `${SITE_URL}/${locale}/blog/${entry.slug}`,
          lastModified: new Date(entry.updated_at),
          changeFrequency: "monthly" as const,
          priority: 0.7,
          alternates: { languages },
        }));
      });

  return [...staticEntries, ...postEntries];
}
