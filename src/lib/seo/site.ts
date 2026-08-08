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

/** The support number rendered on /contact. Same value, one place. */
export const SITE_PHONE = "+966591968557";

/**
 * Business location, at city granularity only.
 *
 * NO streetAddress and NO postalCode, deliberately. A real location is a
 * genuine trust signal in this market, but the precision that helps a search
 * engine resolve an entity stops at the city — a street address adds nothing
 * for a SaaS product with no premises customers visit, and publishes more than
 * the business needs to.
 *
 * Source: the founder's LinkedIn states "Jiddah, Makkah, Saudi Arabia".
 * Jeddah is the city; Makkah is the province containing it. The Facebook page
 * writes the same place as "makkah, 21955" — same location, different wording.
 * NAP consistency wants ONE form everywhere, so align the directories to this.
 */
export const SITE_ADDRESS = {
  city: "Jeddah",
  cityAr: "جدة",
  region: "Makkah Province",
  regionAr: "منطقة مكة المكرمة",
  country: "SA",
} as const;

/**
 * The markets Mawedly actually serves, as ISO 3166-1 alpha-2.
 *
 * This is NOT an aspirational list. It mirrors GULF_DIAL_CODES in
 * src/lib/whatsapp.ts — the only phone prefixes the product can turn into a
 * working wa.me link. A customer outside these countries cannot be messaged
 * through the booking flow, so claiming their market in schema would be a claim
 * the product does not honour. Egypt in particular is absent for that reason:
 * add "EG" here only when +20 is added there.
 */
export const AREA_SERVED = ["SA", "AE", "BH", "QA", "KW", "OM"] as const;

/**
 * Verified profiles for the ORGANISATION. Fill these in — each one materially
 * strengthens entity resolution. Leave a line empty rather than guessing: a
 * sameAs that 404s undermines the very trust it is meant to build.
 */
const ORG_PROFILES: string[] = [
  "https://x.com/mawedly",
  "https://www.facebook.com/profile.php?id=61593097349034",
];

/*
 * VERIFIED BEFORE LISTING, 2026-08-07. Both profiles carry Mawedly's name and
 * mark, and both link BACK to mawedly.com — that reciprocity is what turns a
 * sameAs from an assertion into something a resolver can confirm.
 *
 * The X account was deliberately held out of an earlier revision: its display
 * name still read "Electro Insights" from a previous life, and sameAs is an
 * identity claim, not a link list. Naming an account that calls itself
 * something else does not merely fail to help — it answers "who is Mawedly?"
 * incorrectly. It was added only once the name, bio and link were corrected.
 *
 * Apply the same test to anything added here: does the profile name the
 * company, and does it link back? If not, leave it out. A gap is neutral; a
 * mismatch is a wrong answer.
 *
 * TODO: a LinkedIn *company* page (/company/mawedly) and Instagram belong here
 * when they exist. Worth replacing the Facebook profile.php?id= URL with a
 * vanity URL once claimed — the numeric form resolves, but a named one is a
 * stabler identifier.
 */

/*
 * DELIBERATELY NOT HERE: the founder's personal LinkedIn.
 *
 * It lives in AUTHOR_PROFILES below, on the Person entity. sameAs exists to
 * answer "which real-world entity is this?" — listing a personal profile among
 * an organisation's accounts asks a resolver to treat a person and a company as
 * the same thing, which weakens the very link the field is for. The founder is
 * already connected to the company through Person.worksFor.
 *
 * TODO when they exist: a LinkedIn *company* page (/company/mawedly) and an
 * Instagram account both belong here. Also worth replacing the Facebook
 * profile.php?id= URL with a vanity URL once one is claimed — the numeric form
 * still resolves, but a named URL is a stronger, more stable identifier.
 */

/** Verified profiles for the AUTHOR (the founder who writes the blog). */
const AUTHOR_PROFILES: string[] = [
  "https://www.linkedin.com/in/abdullah-fadul-3660ba221/",
];

export const AUTHOR = {
  nameAr: "عبدالله فاضل",
  nameEn: "Abdullah Fadul",
  jobTitleAr: "مؤسس موعدلي",
  jobTitleEn: "Founder, Mawedly",
} as const;

const clean = (urls: string[]) => urls.filter((u) => u.trim().length > 0);

export type SeoLocale = "ar" | "en";

/**
 * Narrow the route's `string` locale to the two the SEO helpers accept.
 *
 * The [locale] segment is already validated by the layout, so anything reaching
 * here is "ar" or "en" — but the param is typed `string`. Falling back to
 * Arabic keeps the helpers honestly typed without a cast, and Arabic is the
 * default locale, so the fallback is the same answer next-intl would give.
 */
export function seoLocale(locale: string): SeoLocale {
  return locale === "en" ? "en" : "ar";
}

export function siteName(locale: SeoLocale) {
  return locale === "ar" ? SITE_NAME_AR : SITE_NAME_EN;
}

/**
 * The publisher entity, reused by every schema that needs one.
 *
 * NOT LocalBusiness. That type describes a place customers physically visit
 * during opening hours; Mawedly is SaaS. Marking it up as a local business
 * invites a manual action and produces no local-pack listing anyway. An
 * Organization may still carry an address — that is a different claim from
 * "customers come here during opening hours".
 *
 * The address is city-level (see SITE_ADDRESS). It was omitted entirely until
 * a real, publicly stated location existed: in this market a genuine address is
 * a trust signal, but an invented one is worse than none.
 */
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
    // Real ISO country codes rather than the bare string "GCC", which is not a
    // place any parser can resolve. See AREA_SERVED for why this list is short.
    areaServed: AREA_SERVED.map((code) => ({
      "@type": "Country",
      identifier: code,
    })),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: SITE_EMAIL,
      telephone: SITE_PHONE,
      // Both are first-class, not a translation of each other.
      availableLanguage: ["Arabic", "English"],
      areaServed: [...AREA_SERVED],
    },
    address: {
      "@type": "PostalAddress",
      addressLocality:
        locale === "ar" ? SITE_ADDRESS.cityAr : SITE_ADDRESS.city,
      addressRegion:
        locale === "ar" ? SITE_ADDRESS.regionAr : SITE_ADDRESS.region,
      addressCountry: SITE_ADDRESS.country,
    },
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/icon-512.png`,
      width: 512,
      height: 512,
    },
    // Omitted entirely when empty — an empty array is noise in the graph, and a
    // sameAs pointing at a 404 or someone else's handle weakens the very link
    // it exists to build.
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
