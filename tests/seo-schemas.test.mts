// Structured data fails silently: a schema that contradicts the page, or one
// carrying markup Google treats as a policy violation, looks identical to a
// working one in the browser. These assertions cover the failures that never
// announce themselves.
//
// Run with:  npm run test:seo

import { test } from "node:test";
import assert from "node:assert/strict";
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

test("Organization has a bilingual contact point and no invented address", () => {
  const org = organizationSchema("ar", "d") as Record<string, unknown>;
  const contact = org.contactPoint as { availableLanguage: string[] };
  assert.deepEqual(contact.availableLanguage, ["Arabic", "English"]);
  // An invented address is worse than none in this market.
  assert.equal(org.address, undefined, "address must stay omitted until real");
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

test("locale-specific schemas differ between ar and en", () => {
  assert.notEqual(webSiteSchema("ar").url, webSiteSchema("en").url);
  assert.notEqual(software("ar").name, software("en").name);
});
