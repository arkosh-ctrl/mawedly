// Slugs that collide with real app routes (or are otherwise unsafe) and must
// not be usable as a business slug — otherwise the static route would shadow the
// public booking page /[locale]/[slug].
export const RESERVED_SLUGS = new Set<string>([
  "ar",
  "en",
  "api",
  "auth",
  "dashboard",
  "login",
  "signup",
  "review",
  "update-password",
  // Static marketing routes — must not be shadowed by a business slug.
  "how-it-works",
  "pricing",
  "about",
  "faq",
  "contact",
  "privacy",
  "terms",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.trim().toLowerCase());
}
