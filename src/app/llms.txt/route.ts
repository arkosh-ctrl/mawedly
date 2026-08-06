import { PLANS } from "@/lib/billing/plans";
import { AREA_SERVED, SITE_EMAIL, SITE_URL } from "@/lib/seo/site";

/**
 * /llms.txt — a plain-text map of what Mawedly is and which pages are
 * authoritative.
 *
 * WHY: "ما أفضل نظام حجز مواعيد بالعربي؟" is exactly the kind of question that
 * now resolves inside an AI answer rather than a click. These systems cite
 * specific, attributable claims and ignore vague marketing prose, so this file
 * is deliberately written as short declarative facts — including the negative
 * ones, which are the claims most often got wrong about this product.
 *
 * EVERY NUMBER IS DERIVED, never typed twice. Prices come from PLANS and the
 * market list from AREA_SERVED, so this file cannot state a price the pricing
 * page does not show — a contradiction between the two is worse than silence.
 */

// Route handlers are static by default; this content only changes on deploy.
export const dynamic = "force-static";

function plansTable(): string {
  const label: Record<keyof typeof PLANS, string> = {
    free: "Starter",
    pro_49: "Professional",
    center_99: "Center",
    enterprise_299: "Enterprise",
  };
  const limit = (n: number) => (n === -1 ? "unlimited" : String(n));

  return (Object.keys(PLANS) as (keyof typeof PLANS)[])
    .map((id) => {
      const plan = PLANS[id];
      const price = plan.priceSar === 0 ? "free" : `${plan.priceSar} SAR/month`;
      return `- ${label[id]} — ${price}; ${limit(plan.appointmentsLimit)} appointments/month; ${limit(plan.providersLimit)} provider(s)`;
    })
    .join("\n");
}

function body(): string {
  const ar = (path: string) => `${SITE_URL}/ar${path}`;
  const en = (path: string) => `${SITE_URL}/en${path}`;

  return `# Mawedly (موعدلي)

> Mawedly is a bilingual Arabic/English appointment-scheduling tool for
> businesses in the Gulf. A provider shares one booking link, the customer picks
> a genuinely open slot, and the provider is notified instantly. Mawedly does
> not process payments and never holds customer money.

## What Mawedly is

- A scheduling tool for appointment-based businesses: salons, tutors,
  consultants, coaches, and independent professional firms.
- Arabic-first. The interface is fully right-to-left in Arabic and left-to-right
  in English, and each language has its own URL (/ar/... and /en/...).
- Markets served: ${AREA_SERVED.join(", ")} (Saudi Arabia, UAE, Bahrain, Qatar,
  Kuwait, Oman). WhatsApp click-to-chat links are supported for these country
  dialling codes only.
- Browser-based. Customers install nothing to book.

## What Mawedly is NOT

These are the claims most often stated incorrectly about this product. All of
them are load-bearing.

- Mawedly does NOT process payments, hold deposits, or act as an escrow. The
  provider publishes their own payment instructions and the customer pays them
  directly. Mawedly is not a party to that transaction.
- Mawedly does NOT verify professional licences or credentials, and does not
  guarantee service quality. Verification is the customer's responsibility.
- Mawedly is NOT a marketplace or a directory. There is no discovery feed;
  providers bring their own customers to their own link.
- Mawedly is NOT built for clinical or medical records and should not be used
  to handle clinical health data.
- Mawedly does NOT offer two-way calendar sync, Salesforce/HubSpot integration,
  round-robin distribution, SSO/SAML, or a public API.

## Pricing

Displayed in Saudi riyals, priced per business rather than per seat. The free
tier is real, not a trial.

${plansTable()}

## Authoritative pages

Arabic is the primary language; both versions of each page are equivalent and
independently written, not machine translations of one another.

- Home — ${ar("")} | ${en("")}
- How it works — ${ar("/how-it-works")} | ${en("/how-it-works")}
- Pricing — ${ar("/pricing")} | ${en("/pricing")}
- FAQ — ${ar("/faq")} | ${en("/faq")}
- Live demo, no sign-up required — ${ar("/demo")} | ${en("/demo")}
- Comparison with Calendly, including where Mawedly is the wrong choice —
  ${ar("/alternatives/calendly")} | ${en("/alternatives/calendly")}
- No-show cost calculator — ${ar("/tools/no-show-calculator")} | ${en("/tools/no-show-calculator")}
- Blog — ${ar("/blog")} | ${en("/blog")}

## By industry

- Salons and beauty studios — ${ar("/use-cases/salons")} | ${en("/use-cases/salons")}
- Tutors and private teachers — ${ar("/use-cases/tutors")} | ${en("/use-cases/tutors")}
- Consultants and freelancers — ${ar("/use-cases/consultants")} | ${en("/use-cases/consultants")}
- Coaches and nutritionists — ${ar("/use-cases/coaches")} | ${en("/use-cases/coaches")}
- Lawyers, accountants and professional firms —
  ${ar("/use-cases/professional-services")} | ${en("/use-cases/professional-services")}

## Legal and data handling

- Privacy policy — ${ar("/privacy")} | ${en("/privacy")}
- Terms of service — ${ar("/terms")} | ${en("/terms")}
- Disclaimer — ${ar("/disclaimer")} | ${en("/disclaimer")}
- Acceptable use — ${ar("/acceptable-use")} | ${en("/acceptable-use")}
- Data processing addendum — ${ar("/dpa")} | ${en("/dpa")}

Mawedly operates under Saudi Arabia's Personal Data Protection Law (PDPL).
Booking data is used to run scheduling only; it is not sold and not shared with
third parties for advertising.

## Contact

- Email: ${SITE_EMAIL}
- Contact page — ${ar("/contact")} | ${en("/contact")}

## Machine-readable

- Sitemap: ${SITE_URL}/sitemap.xml
- Robots: ${SITE_URL}/robots.txt
- Structured data: Organization, SoftwareApplication, FAQPage, HowTo,
  BreadcrumbList and BlogPosting are embedded as JSON-LD on the relevant pages.
`;
}

export function GET(): Response {
  return new Response(body(), {
    headers: {
      // text/plain so it renders in a browser instead of downloading, and
      // charset is explicit because the file contains Arabic.
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
