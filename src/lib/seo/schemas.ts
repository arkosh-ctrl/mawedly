// Relative, with explicit .ts extensions, so the Node-based test suite can
// import this module directly — Node's ESM resolver understands neither the "@/"
// alias nor an omitted extension.
import { PLANS, type PlanId } from "../billing/plans.ts";
import { AREA_SERVED, SITE_URL, siteName, type SeoLocale } from "./site.ts";

/**
 * Page-level schema builders.
 *
 * EVERY builder here takes the strings the page already renders. Nothing is
 * hardcoded a second time. A schema that repeats copy instead of reusing it
 * drifts on the first edit, and a schema contradicting the visible page gets
 * dropped — quietly, with no warning anywhere.
 *
 * FORBIDDEN, deliberately absent, and it must stay that way:
 *   - aggregateRating / reviewCount / ratingValue. Self-serving review markup
 *     violates Google's structured-data policy, and the penalty is a manual
 *     action that strips rich results SITEWIDE, not just the rating.
 *   - Any claim that Mawedly processes payments or holds deposits. It does not:
 *     payment happens directly between provider and customer.
 */

/** Plan order as the pricing page shows it. */
const PLAN_ORDER: PlanId[] = ["free", "pro_49", "center_99", "enterprise_299"];

export type PlanCopy = {
  /** Localised plan name, e.g. "البداية" / "Starter". */
  name: (id: PlanId) => string;
  /** Localised feature label, e.g. "رابط حجز خاص". */
  feature: (key: string) => string;
};

/**
 * The product itself, for the home page.
 *
 * The free tier is REAL — Starter is 0 SAR with a 15-appointment monthly
 * ceiling — so a price: 0 Offer here is legitimate rather than bait. Prices are
 * read from PLANS, the same config that enforces the limits, so schema and
 * /pricing cannot disagree.
 *
 * SAR because that is the currency the pricing page displays. The Lemon Squeezy
 * products are billed in USD (a Merchant of Record cannot settle SAR), but the
 * SERP-visible price must match the SERP-visible page.
 */
export function softwareApplicationSchema(
  locale: SeoLocale,
  description: string,
  copy: PlanCopy,
) {
  return {
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software`,
    name: siteName(locale),
    alternateName: locale === "ar" ? "Mawedly" : "موعدلي",
    url: `${SITE_URL}/${locale}`,
    description,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Appointment Scheduling",
    // Browser-based: there is no app to install, which is a selling point the
    // home page makes explicitly.
    operatingSystem: "Web",
    inLanguage: ["ar", "en"],
    availableOnDevice: "Desktop, Tablet, Mobile",
    areaServed: AREA_SERVED.map((code) => ({
      "@type": "Country",
      identifier: code,
    })),
    publisher: { "@id": `${SITE_URL}/#organization` },
    featureList: [
      "bookingLink",
      "whatsapp",
      "bilingual",
      "emails",
      "calendar",
      "video",
      "social",
      "analytics",
      "branding",
    ].map(copy.feature),
    offers: PLAN_ORDER.map((id) => ({
      "@type": "Offer",
      name: copy.name(id),
      price: String(PLANS[id].priceSar),
      priceCurrency: "SAR",
      // Stated so a parser does not read 49 as a one-off purchase.
      category: "SaaS subscription",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/${locale}/pricing`,
    })),
  };
}

/** The site entity. One per locale root. */
export function webSiteSchema(locale: SeoLocale) {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: `${SITE_URL}/${locale}`,
    name: siteName(locale),
    inLanguage: locale,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export type HowToStep = { title: string; body: string };

/**
 * /how-it-works. HowTo is one of the few rich-result types left with real SERP
 * real estate, and the page already has a clean numbered sequence — the steps
 * passed in are the same objects the page maps over.
 */
export function howToSchema(
  locale: SeoLocale,
  name: string,
  description: string,
  steps: HowToStep[],
) {
  const pageUrl = `${SITE_URL}/${locale}/how-it-works`;
  return {
    "@type": "HowTo",
    "@id": `${pageUrl}#howto`,
    name,
    description,
    inLanguage: locale,
    // A real zero: setting up a booking link costs nothing on the free plan.
    estimatedCost: { "@type": "MonetaryAmount", currency: "SAR", value: "0" },
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.body,
      url: `${pageUrl}#step-${i + 1}`,
    })),
  };
}

export type FaqItem = { q: string; a: string };

/** /faq. Built from the same items the page renders as <details> elements. */
export function faqPageSchema(locale: SeoLocale, items: FaqItem[]) {
  return {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/${locale}/faq#faq`,
    inLanguage: locale,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
