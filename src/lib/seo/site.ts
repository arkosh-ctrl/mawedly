/**
 * One source of truth for the entity signals search engines and AI answer
 * engines use to decide who "Mawedly" is.
 *
 * These systems resolve a brand to an ENTITY before they will cite it. The
 * links in SAME_AS are how that resolution happens: they let a crawler confirm
 * that the site, the LinkedIn page and the founder are the same organisation
 * rather than three unrelated strings.
 *
 * Empty entries are filtered out everywhere they are used, so an unfilled
 * placeholder never ships as a broken sameAs — a schema pointing at a 404 is
 * worse than omitting the field.
 */

/**
 * Canonical origin. Everything absolute in the app derives from this.
 *
 * NOTE: mawedly.com answers 308 -> www.mawedly.com. Set NEXT_PUBLIC_APP_URL to
 * the www origin in Vercel, otherwise every canonical and hreflang on the site
 * points at a redirect instead of the final URL.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.mawedly.com"
).replace(/\/+$/, "");

export const SITE_NAME_EN = "Mawedly";
export const SITE_NAME_AR = "موعدلي";
export const SITE_EMAIL = "hello@mawedly.com";

/**
 * Verified profiles for the ORGANISATION. Fill these in — each one materially
 * strengthens entity resolution. Leave a line empty rather than guessing: a
 * sameAs that 404s undermines the very trust it is meant to build.
 */
const ORG_PROFILES: string[] = [
  // "https://www.linkedin.com/company/mawedly/",
  // "https://x.com/mawedly",
  // "https://www.instagram.com/mawedly/",
];

/** Verified profiles for the AUTHOR (the founder who writes the blog). */
const AUTHOR_PROFILES: string[] = [
  // "https://www.linkedin.com/in/…",
];

export const AUTHOR = {
  nameAr: "عبدالله فاضل",
  nameEn: "Abdullah Fadul",
  jobTitleAr: "مؤسس موعدلي",
  jobTitleEn: "Founder, Mawedly",
} as const;

const clean = (urls: string[]) => urls.filter((u) => u.trim().length > 0);

export type SeoLocale = "ar" | "en";

export function siteName(locale: SeoLocale) {
  return locale === "ar" ? SITE_NAME_AR : SITE_NAME_EN;
}

/** The publisher entity, reused by every schema that needs one. */
export function organizationSchema(locale: SeoLocale, description?: string) {
  const sameAs = clean(ORG_PROFILES);
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME_EN,
    alternateName: SITE_NAME_AR,
    url: SITE_URL,
    ...(description ? { description } : {}),
    email: SITE_EMAIL,
    areaServed: "GCC",
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/icon-512.png`,
      width: 512,
      height: 512,
    },
    // Omitted entirely when empty — an empty array is noise in the graph.
    ...(sameAs.length ? { sameAs } : {}),
    ...(locale === "ar" ? { knowsLanguage: ["ar", "en"] } : {}),
  };
}

/**
 * The author as a PERSON, not the company.
 *
 * Search and AI systems weigh named, attributable expertise more heavily than
 * anonymous corporate authorship — and an operator writing about the problem he
 * builds for is exactly the signal they are looking for.
 */
export function personSchema(locale: SeoLocale) {
  const sameAs = clean(AUTHOR_PROFILES);
  return {
    "@type": "Person",
    "@id": `${SITE_URL}/#author`,
    name: locale === "ar" ? AUTHOR.nameAr : AUTHOR.nameEn,
    jobTitle: locale === "ar" ? AUTHOR.jobTitleAr : AUTHOR.jobTitleEn,
    url: `${SITE_URL}/${locale}/about`,
    worksFor: { "@id": `${SITE_URL}/#organization` },
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export type Crumb = { name: string; url: string };

/** Breadcrumbs let a result show a path instead of a bare URL. */
export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

/** Wrap one or more schema objects in a single @graph document. */
export function jsonLdGraph(...nodes: object[]) {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes });
}
