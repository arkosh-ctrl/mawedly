// Structured data is invisible: a broken graph looks exactly like a working one
// in the browser, and you only find out weeks later in Search Console. These
// assertions cover the failures that stay silent.
//
// Run with:  npm run test:seo

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SITE_URL,
  breadcrumbSchema,
  jsonLdGraph,
  organizationSchema,
  personSchema,
} from "../src/lib/seo/site.ts";

type Node = Record<string, unknown>;

function graph(...nodes: object[]): Node[] {
  const parsed = JSON.parse(jsonLdGraph(...nodes));
  assert.equal(parsed["@context"], "https://schema.org");
  return parsed["@graph"] as Node[];
}

/** Collect every string in the tree that looks like an absolute URL. */
function urls(value: unknown, found: string[] = []): string[] {
  if (typeof value === "string" && /^https?:\/\//.test(value)) found.push(value);
  else if (Array.isArray(value)) value.forEach((v) => urls(v, found));
  else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => urls(v, found));
  }
  return found;
}

test("the graph is valid JSON with a schema.org context", () => {
  const nodes = graph(organizationSchema("ar"), personSchema("ar"));
  assert.equal(nodes.length, 2);
});

test("organisation and person are linked by @id, not duplicated", () => {
  const [org, person] = graph(organizationSchema("en"), personSchema("en"));
  assert.equal(org["@id"], `${SITE_URL}/#organization`);
  assert.equal(person["@id"], `${SITE_URL}/#author`);
  // The person must POINT at the organisation rather than restating it —
  // a second inline Organization creates a competing entity in the graph.
  assert.deepEqual(person.worksFor, { "@id": `${SITE_URL}/#organization` });
});

test("an empty sameAs is omitted, never emitted as []", () => {
  // An unfilled placeholder must not ship: sameAs is a trust signal, and an
  // empty or 404ing one is worse than no field at all.
  for (const node of [organizationSchema("ar"), personSchema("ar")] as Node[]) {
    if ("sameAs" in node) {
      const list = node.sameAs as string[];
      assert.ok(Array.isArray(list) && list.length > 0, "sameAs present but empty");
      for (const url of list) {
        assert.ok(/^https:\/\/\S+$/.test(url), `sameAs entry not an https URL: ${url}`);
      }
    }
  }
});

test("no schema URL points at the redirecting apex", () => {
  // mawedly.com answers 308 -> www. Structured data must name the final URL,
  // otherwise every entity reference costs an extra hop to resolve.
  const all = urls([
    organizationSchema("ar"),
    personSchema("ar"),
    breadcrumbSchema([{ name: "x", url: `${SITE_URL}/ar/blog` }]),
  ]);
  assert.ok(all.length > 0);
  for (const url of all) {
    assert.ok(
      !/^https?:\/\/mawedly\.com/.test(url),
      `points at the apex instead of the canonical origin: ${url}`,
    );
  }
});

test("breadcrumb positions are 1..n in order", () => {
  const crumbs = [
    { name: "Home", url: `${SITE_URL}/en` },
    { name: "Blog", url: `${SITE_URL}/en/blog` },
    { name: "Post", url: `${SITE_URL}/en/blog/x` },
  ];
  const schema = breadcrumbSchema(crumbs) as Node;
  const items = schema.itemListElement as Node[];
  assert.equal(items.length, 3);
  items.forEach((item, i) => {
    assert.equal(item.position, i + 1);
    assert.equal(item.item, crumbs[i].url);
    assert.equal(item.name, crumbs[i].name);
  });
});

test("both locales produce a usable organisation name", () => {
  for (const locale of ["ar", "en"] as const) {
    const org = organizationSchema(locale) as Node;
    assert.equal(org.name, "Mawedly");
    assert.equal(org.alternateName, "موعدلي");
    assert.ok(String(org.url).startsWith("https://"));
  }
});

test("the author is a Person, not the company", () => {
  // Named, attributable expertise is the point: an article authored by an
  // Organization carries none of the E-E-A-T signal an operator's name does.
  const person = personSchema("ar") as Node;
  assert.equal(person["@type"], "Person");
  assert.ok(String(person.name).length > 2);
  assert.ok(String(person.url).includes("/ar/about"));
});
