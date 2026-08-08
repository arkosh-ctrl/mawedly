// Structured data fails silently: a schema that contradicts the page, or one
// carrying markup Google treats as a policy violation, looks identical to a
// working one in the browser. These assertions cover the failures that never
// announce themselves.
//
// Run with:  npm run test:seo

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  faqPageSchema,
  howToSchema,
  softwareApplicationSchema,
  webSiteSchema,
} from "../src/lib/seo/schemas.ts";
import {
  AREA_SERVED,
  SITE_URL,
  jsonLdGraph,
  organizationSchema,
  personSchema,
} from "../src/lib/seo/site.ts";
import { PLANS } from "../src/lib/billing/plans.ts";

const COPY = {
  name: (id: string) => `plan-${id}`,
  feature: (key: string) => `feature-${key}`,
};

const software = (locale: "ar" | "en" = "ar") =>
  softwareApplicationSchema(locale, "desc", COPY as never);

/** Every string anywhere in the tree. */
function strings(value: unknown, found: string[] = []): string[] {
  if (typeof value === "string") found.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, found));
  else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => strings(v, found));
  }
  return found;
}

/** Every object key anywhere in the tree. */
function keys(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => keys(v, found));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      found.push(k);
      keys(v, found);
    }
  }
  return found;
}

test("schema prices match PLANS exactly", () => {
  // The forbidden failure: a price in schema that /pricing does not show. It is
  // read as deceptive markup, not as a typo.
  const offers = software().offers;
  assert.equal(offers.length, 4);
  for (const offer of offers) {
    assert.equal(offer.priceCurrency, "SAR", "pricing page displays SAR");
  }
  const prices = offers.map((o) => o.price).sort();
  const expected = Object.values(PLANS)
    .map((p) => String(p.priceSar))
    .sort();
  assert.deepEqual(prices, expected);
});

test("the free plan is offered at 0 — it is a real tier, not bait", () => {
  const free = software().offers.find((o) => o.price === "0");
  assert.ok(free, "no zero-price offer");
  assert.equal(PLANS.free.priceSar, 0, "PLANS no longer has a free tier");
});

test("NO aggregateRating, reviewCount or ratingValue anywhere", () => {
  // Self-serving review markup violates Google's structured-data policy, and
  // the penalty is a manual action stripping rich results SITEWIDE — not just
  // the rating. This must stay a hard failure.
  const forbidden = ["aggregateRating", "reviewCount", "ratingValue", "review"];
  const all = keys([
    organizationSchema("ar", "d"),
    personSchema("ar"),
    webSiteSchema("ar"),
    software(),
    howToSchema("ar", "n", "d", [{ title: "t", body: "b" }]),
    faqPageSchema("ar", [{ q: "q", a: "a" }]),
  ]);
  for (const key of forbidden) {
    assert.ok(!all.includes(key), `forbidden rating markup found: ${key}`);
  }
});

test("no schema implies Mawedly processes payments or holds deposits", () => {
  // Mawedly is a scheduling tool: payment happens directly between provider and
  // customer. A payment claim here is a regulatory problem, not an SEO one.
  const text = strings([organizationSchema("en", "d"), software("en")])
    .join(" ")
    .toLowerCase();
  for (const claim of ["payment process", "escrow", "holds deposit", "we handle"]) {
    assert.ok(!text.includes(claim), `payment-processing claim: "${claim}"`);
  }
});

test("areaServed is the real market list, and excludes Egypt", () => {
  // AREA_SERVED mirrors GULF_DIAL_CODES in src/lib/whatsapp.ts — the only
  // prefixes the product can turn into a working wa.me link. Adding a country
  // here without adding its dial code claims a market that does not work.
  assert.deepEqual([...AREA_SERVED], ["SA", "AE", "BH", "QA", "KW", "OM"]);
  const org = organizationSchema("ar", "d");
  const codes = org.areaServed.map((c) => c.identifier);
  assert.deepEqual(codes, [...AREA_SERVED]);
  assert.ok(!codes.includes("EG"), "Egypt claimed but +20 is not supported");
});

test("Organization has a bilingual contact point", () => {
  const org = organizationSchema("ar", "d") as Record<string, unknown>;
  const contact = org.contactPoint as { availableLanguage: string[] };
  assert.deepEqual(contact.availableLanguage, ["Arabic", "English"]);
});

test("the address is city-level only — no street, no postal code", () => {
  // Precision beyond the city buys nothing for a SaaS product with no premises
  // a customer visits, and publishes more than the business needs to. This
  // guards against someone "completing" the address later out of tidiness.
  for (const locale of ["ar", "en"] as const) {
    const address = (organizationSchema(locale, "d") as Record<string, unknown>)
      .address as Record<string, unknown>;
    assert.ok(address, `no address for ${locale}`);
    assert.equal(address["@type"], "PostalAddress");
    assert.equal(address.streetAddress, undefined, "street address leaked in");
    assert.equal(address.postalCode, undefined, "postal code leaked in");
    assert.equal(address.addressCountry, "SA");
    assert.ok(address.addressLocality, "city missing");
    assert.ok(address.addressRegion, "region missing");
  }

  // The place is written in the reader's language, not transliterated once and
  // reused — the same reason every other string on the site has two versions.
  const ar = (organizationSchema("ar", "d") as Record<string, unknown>)
    .address as Record<string, string>;
  const en = (organizationSchema("en", "d") as Record<string, unknown>)
    .address as Record<string, string>;
  assert.notEqual(ar.addressLocality, en.addressLocality);
});

test("Organization omits sameAs entirely rather than shipping empty", () => {
  const org = organizationSchema("ar", "d") as Record<string, unknown>;
  const sameAs = org.sameAs as string[] | undefined;
  // Either absent, or every entry is a real absolute URL. Never an empty array,
  // never a placeholder — a sameAs pointing at a 404 weakens the entity link it
  // exists to build.
  if (sameAs !== undefined) {
    assert.ok(sameAs.length > 0, "empty sameAs array is noise");
    sameAs.forEach((u) => assert.match(u, /^https:\/\//));
  }
});

test("the company and the founder keep separate sameAs profiles", () => {
  // sameAs answers "which real-world entity is this?". A personal profile
  // listed among a company's accounts asks a resolver to treat a person and an
  // organisation as one entity, which weakens the link the field exists to
  // build. The founder is tied to the company through Person.worksFor instead.
  const org = organizationSchema("ar", "d") as { sameAs?: string[] };
  const person = personSchema("ar") as { sameAs?: string[] };

  for (const url of org.sameAs ?? []) {
    assert.ok(
      !/linkedin\.com\/in\//.test(url),
      `personal LinkedIn profile in Organization.sameAs: ${url}`,
    );
  }
  // And the reverse: a company page does not belong on the Person.
  for (const url of person.sameAs ?? []) {
    assert.ok(
      !/linkedin\.com\/company\//.test(url),
      `company page in Person.sameAs: ${url}`,
    );
  }
  // No URL may appear on both entities.
  const shared = (org.sameAs ?? []).filter((u) =>
    (person.sameAs ?? []).includes(u),
  );
  assert.deepEqual(shared, [], "same profile claimed by two entities");
});

test("Mawedly is not marked up as a LocalBusiness", () => {
  // That type describes a place customers physically visit during opening
  // hours. Mawedly is SaaS: the type invites a manual action and yields no
  // local-pack listing.
  const types = strings([organizationSchema("ar", "d"), software()]);
  assert.ok(!types.includes("LocalBusiness"));
  assert.equal(organizationSchema("ar", "d")["@type"], "Organization");
});

test("every node in a graph points at an @id that the graph defines", () => {
  const graph = JSON.parse(
    jsonLdGraph(organizationSchema("ar", "d"), webSiteSchema("ar"), software(), personSchema("ar")),
  );
  const defined = new Set<string>(
    graph["@graph"].map((n: Record<string, string>) => n["@id"]),
  );
  // Collect every reference of the shape { "@id": "..." } used as a pointer.
  const refs: string[] = [];
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      const obj = v as Record<string, unknown>;
      if (Object.keys(obj).length === 1 && typeof obj["@id"] === "string") {
        refs.push(obj["@id"] as string);
      }
      Object.values(obj).forEach(walk);
    }
  };
  walk(graph["@graph"]);
  assert.ok(refs.length > 0, "graph has no @id references — nothing is linked");
  for (const ref of refs) {
    assert.ok(defined.has(ref), `dangling @id reference: ${ref}`);
  }
});

test("HowTo steps are positioned and anchored to real fragments", () => {
  const steps = [
    { title: "one", body: "b1" },
    { title: "two", body: "b2" },
  ];
  const howTo = howToSchema("en", "name", "desc", steps);
  assert.equal(howTo.step.length, 2);
  howTo.step.forEach((s, i) => {
    assert.equal(s.position, i + 1);
    assert.equal(s.name, steps[i].title);
    assert.equal(s.text, steps[i].body);
    // The page renders id="step-N" on each <li>; without that these 404 to top.
    assert.equal(s.url, `${SITE_URL}/en/how-it-works#step-${i + 1}`);
  });
});

test("FAQPage mirrors the items given, in order", () => {
  const items = [
    { q: "q1", a: "a1" },
    { q: "q2", a: "a2" },
  ];
  const faq = faqPageSchema("ar", items);
  assert.equal(faq.mainEntity.length, 2);
  faq.mainEntity.forEach((entry, i) => {
    assert.equal(entry.name, items[i].q);
    assert.equal(entry.acceptedAnswer.text, items[i].a);
  });
});

test("NAP: the phone and email exist in exactly one place in the source", () => {
  // Name, Address, Phone consistency. A contact detail that differs between the
  // visible page and the structured data reads as a trust signal against the
  // site. These used to live in site.ts, in contact/page.tsx AND in both
  // message catalogues — three copies that agreed only by coincidence.
  //
  // This scans the real source tree rather than trusting a convention, because
  // a convention is exactly what failed here the first time.
  const roots = ["src", "messages"];
  const offenders: string[] = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx|json)$/.test(entry.name)) continue;
      // site.ts is the single source and is allowed to contain both.
      if (full.endsWith(join("lib", "seo", "site.ts"))) continue;

      const body = readFileSync(full, "utf8");
      if (body.includes("591968557")) offenders.push(`${full} (phone)`);
      // A mailto: template or a doc comment naming the address is fine; a
      // literal address rendered as content is not. Both current uses are in
      // site.ts, so any hit outside it is a regression worth failing on.
      if (/["']hello@mawedly\.com["']/.test(body)) {
        offenders.push(`${full} (email)`);
      }
    }
  };
  roots.forEach(walk);

  assert.deepEqual(
    offenders,
    [],
    `contact details duplicated outside src/lib/seo/site.ts:\n${offenders.join("\n")}`,
  );
});

test("locale-specific schemas differ between ar and en", () => {
  assert.notEqual(webSiteSchema("ar").url, webSiteSchema("en").url);
  assert.notEqual(software("ar").name, software("en").name);
});
