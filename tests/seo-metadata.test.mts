// The metadata helper makes four promises that are invisible in a browser and
// only surface weeks later in Search Console: reciprocal hreflang, a canonical
// on the www host, a complete openGraph object on EVERY page, and a Twitter
// card. Each one looks fine when broken. These assertions are the only thing
// standing between a regression and a silent ranking loss.
//
// Run with:  npm run test:seo

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LOCALIZED_PATHS,
  absoluteUrl,
  dynamicPageMetadata,
  languageAlternates,
  noindexMetadata,
  pageMetadata,
} from "../src/lib/seo/metadata.ts";
import { SITE_URL } from "../src/lib/seo/site.ts";

const LOCALES = ["ar", "en"] as const;

/** Collect every absolute URL anywhere in a metadata tree. */
function urls(value: unknown, found: string[] = []): string[] {
  if (typeof value === "string" && /^https?:\/\//.test(value)) found.push(value);
  else if (value instanceof URL) found.push(value.toString());
  else if (Array.isArray(value)) value.forEach((v) => urls(v, found));
  else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => urls(v, found));
  }
  return found;
}

function build(locale: (typeof LOCALES)[number], path: string) {
  return pageMetadata({
    locale,
    // Safe: every caller below iterates LOCALIZED_PATHS, so the value really is
    // a LocalizedPath. The cast exists only because the loop widens it.
    path: path as (typeof LOCALIZED_PATHS)[number]["path"],
    title: "t",
    description: "d",
  });
}

test("hreflang is reciprocal in both directions for every localized path", () => {
  for (const { path } of LOCALIZED_PATHS) {
    const ar = build("ar", path).alternates?.languages as Record<string, string>;
    const en = build("en", path).alternates?.languages as Record<string, string>;

    // The Arabic page claims the English one AND the English page claims the
    // Arabic one back. Google discards one-directional hreflang wholesale, not
    // partially, so a single missing return tag voids the pair entirely.
    assert.equal(ar.en, absoluteUrl("en", path), `ar->en broken for "${path}"`);
    assert.equal(en.ar, absoluteUrl("ar", path), `en->ar broken for "${path}"`);
    assert.deepEqual(ar, en, `alternates disagree between locales for "${path}"`);
  }
});

test("x-default points at Arabic, the primary market", () => {
  for (const { path } of LOCALIZED_PATHS) {
    assert.equal(languageAlternates(path)["x-default"], absoluteUrl("ar", path));
  }
});

test("canonical is self-referential and locale-prefixed", () => {
  for (const { path } of LOCALIZED_PATHS) {
    for (const locale of LOCALES) {
      assert.equal(build(locale, path).alternates?.canonical, absoluteUrl(locale, path));
    }
  }
});

test("no URL anywhere resolves to the bare apex", () => {
  // mawedly.com answers 308 -> www.mawedly.com. A canonical, og:url or hreflang
  // pointing at the apex sends every crawl through a redirect and splits the
  // signal across two URLs.
  for (const { path } of LOCALIZED_PATHS) {
    for (const locale of LOCALES) {
      for (const url of urls(build(locale, path))) {
        assert.ok(
          !/^https?:\/\/mawedly\.com/.test(url),
          `apex URL leaked into metadata: ${url}`,
        );
        assert.ok(url.startsWith(SITE_URL), `off-origin URL: ${url}`);
      }
    }
  }
});

test("every page emits a COMPLETE openGraph object, images included", () => {
  // Next merges metadata shallowly per top-level key: a page that exports
  // openGraph replaces the layout's wholesale rather than merging field by
  // field. So a layout-level og:image would be silently dropped here.
  for (const { path } of LOCALIZED_PATHS) {
    for (const locale of LOCALES) {
      const og = build(locale, path).openGraph;
      assert.ok(og, `no openGraph for ${locale}${path}`);
      assert.ok(og.title && og.description, `incomplete openGraph for ${locale}${path}`);
      assert.ok("url" in og && og.url, `no og:url for ${locale}${path}`);
      const images = (og as { images?: unknown[] }).images;
      assert.ok(images?.length, `no og:image for ${locale}${path}`);
    }
  }
});

test("twitter is set independently — Next does not derive it from openGraph", () => {
  for (const locale of LOCALES) {
    const tw = build(locale, "/pricing").twitter;
    assert.equal(tw?.card, "summary_large_image");
    assert.ok((tw as { images?: unknown[] }).images?.length);
  }
});

test("the per-locale social card differs between ar and en", () => {
  const ar = JSON.stringify(build("ar", "").openGraph);
  const en = JSON.stringify(build("en", "").openGraph);
  assert.ok(ar.includes("og-ar.png"), "Arabic card not used on /ar");
  assert.ok(en.includes("og-en.png"), "English card not used on /en");
});

test("dynamic pages never claim a locale that has no translation", () => {
  const arOnly = dynamicPageMetadata({
    locale: "ar",
    path: "/blog/only-arabic",
    availableLocales: ["ar"],
    title: "t",
    description: "d",
  });
  const languages = arOnly.alternates?.languages as Record<string, string>;
  // An alternate pointing at a 404 is worse than emitting none at all.
  assert.equal(languages.en, undefined, "claimed an English alternate that does not exist");
  assert.equal(languages.ar, `${SITE_URL}/ar/blog/only-arabic`);
  assert.equal(languages["x-default"], `${SITE_URL}/ar/blog/only-arabic`);
});

test("dynamic pages emit both alternates when both translations exist", () => {
  const both = dynamicPageMetadata({
    locale: "en",
    path: "/blog/two",
    availableLocales: ["ar", "en"],
    title: "t",
    description: "d",
  });
  const languages = both.alternates?.languages as Record<string, string>;
  assert.equal(languages.ar, `${SITE_URL}/ar/blog/two`);
  assert.equal(languages.en, `${SITE_URL}/en/blog/two`);
});

test("noindex pages are crawlable but not indexable", () => {
  // index:false with follow:true — NOT a robots.txt Disallow. A blocked page is
  // never fetched, so its noindex is never read and it can never be removed.
  const meta = noindexMetadata("Log in");
  assert.deepEqual(meta.robots, { index: false, follow: true });
  assert.equal(meta.title, "Log in");
});

test("the vertical and comparison pages are registered, so they get hreflang and a sitemap entry", () => {
  // These pages exist only because they rank. A page missing from
  // LOCALIZED_PATHS silently loses its canonical, its hreflang pair AND its
  // sitemap entry all at once — and nothing about the page looks broken.
  const paths = LOCALIZED_PATHS.map((p) => p.path);
  for (const vertical of [
    "salons",
    "tutors",
    "consultants",
    "coaches",
    "professional-services",
  ]) {
    assert.ok(
      paths.includes(`/use-cases/${vertical}` as never),
      `vertical page not registered: ${vertical}`,
    );
  }
  assert.ok(paths.includes("/alternatives/calendly" as never));
  assert.ok(paths.includes("/tools/no-show-calculator" as never));
  assert.ok(paths.includes("/demo" as never));
});

test("LOCALIZED_PATHS is well formed and has no duplicates", () => {
  const paths = LOCALIZED_PATHS.map((p) => p.path);
  assert.equal(new Set(paths).size, paths.length, "duplicate path in LOCALIZED_PATHS");
  for (const { path, priority } of LOCALIZED_PATHS) {
    assert.ok(path === "" || path.startsWith("/"), `bad path shape: "${path}"`);
    assert.ok(!path.endsWith("/"), `trailing slash would double up: "${path}"`);
    assert.ok(priority > 0 && priority <= 1, `priority out of range for "${path}"`);
  }
  assert.ok(paths.includes(""), "the home page must be in the list");
});
