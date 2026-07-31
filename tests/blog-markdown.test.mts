// Hostile-input suite for the restricted blog Markdown renderer.
// Run with:  npm run test:blog
// (node --experimental-strip-types --test — no test framework dependency.)
//
// The assertions PARSE the generated tags rather than regex-matching the raw
// output string: a naive regex over the whole output gives false positives on
// escaped text (e.g. the literal "&lt;script&gt;" is harmless but contains the
// word "script").

import { test } from "node:test";
import assert from "node:assert/strict";
import { renderMarkdown, readingMinutes } from "../src/lib/blog/markdown.ts";

const ALLOWED_TAGS = new Set([
  "h2",
  "h3",
  "h4",
  "p",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "strong",
  "em",
  "a",
  "img",
  "figure",
  "hr",
  "br",
]);

type Tag = { name: string; attrs: Record<string, string> };

/** Extract every real tag (name + attributes) from rendered HTML. */
function parseTags(html: string): Tag[] {
  const tags: Tag[] = [];
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*?)?)\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html)) !== null) {
    const attrs: Record<string, string> = {};
    const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g;
    let a: RegExpExecArray | null;
    while ((a = attrRe.exec(m[2])) !== null) attrs[a[1].toLowerCase()] = a[2];
    tags.push({ name: m[1].toLowerCase(), attrs });
  }
  return tags;
}

/** The invariant every hostile input must satisfy. */
function assertSafe(source: string, label: string) {
  const html = renderMarkdown(source);
  for (const tag of parseTags(html)) {
    assert.ok(
      ALLOWED_TAGS.has(tag.name),
      `${label}: tag <${tag.name}> outside the allowlist`,
    );
    for (const [name, value] of Object.entries(tag.attrs)) {
      assert.ok(
        !name.startsWith("on"),
        `${label}: event handler attribute "${name}"`,
      );
      if (name === "href" || name === "src") {
        const scheme = value.trim().toLowerCase();
        assert.ok(
          !scheme.startsWith("javascript:"),
          `${label}: javascript: in ${name}`,
        );
        assert.ok(!scheme.startsWith("data:"), `${label}: data: in ${name}`);
        assert.ok(
          !scheme.startsWith("vbscript:"),
          `${label}: vbscript: in ${name}`,
        );
        assert.ok(
          !scheme.startsWith("//"),
          `${label}: protocol-relative ${name}`,
        );
      }
    }
  }
  return html;
}

// ---------------------------------------------------------------------------
// 1. Hostile input
// ---------------------------------------------------------------------------

test("script tag never becomes markup", () => {
  const html = assertSafe("<script>alert(1)</script>", "script");
  assert.ok(html.includes("&lt;script&gt;"));
});

test("img with onerror never becomes markup", () => {
  assertSafe("<img src=x onerror=alert(1)>", "img-onerror");
});

test("javascript: link is rejected, text preserved", () => {
  const html = assertSafe("[click](javascript:alert(1))", "js-link");
  assert.ok(!parseTags(html).some((t) => t.name === "a"));
  assert.ok(html.includes("click"));
});

test("data: image source is rejected", () => {
  const html = assertSafe(
    "![x](data:text/html,<script>alert(1)</script>)",
    "data-img",
  );
  assert.ok(!parseTags(html).some((t) => t.name === "img"));
});

test("svg onload never becomes markup", () => {
  assertSafe("<svg onload=alert(1)>", "svg-onload");
});

test("script inside a fenced block stays inert", () => {
  const html = assertSafe(
    "```html\n<script>alert(1)</script>\n```",
    "fenced-script",
  );
  const names = parseTags(html).map((t) => t.name);
  assert.ok(names.includes("pre") && names.includes("code"));
  assert.ok(!names.includes("script"));
});

test("uppercase and padded javascript: is rejected", () => {
  const html = assertSafe("[a](  JaVaScRiPt:alert(1))", "js-mixed-case");
  assert.ok(!parseTags(html).some((t) => t.name === "a"));
});

test("protocol-relative url is rejected", () => {
  const html = assertSafe("[a](//evil.example/x)", "protocol-relative");
  assert.ok(!parseTags(html).some((t) => t.name === "a"));
});

test("quote injection cannot break out of an attribute", () => {
  const html = assertSafe('[a](/x" onmouseover="alert(1))', "attr-breakout");
  for (const tag of parseTags(html)) {
    assert.ok(!("onmouseover" in tag.attrs));
  }
});

test("forged inline-code sentinels are stripped", () => {
  const html = assertSafe("\u00010\u0002 plain", "sentinel-forge");
  assert.ok(!html.includes("\u0001") && !html.includes("\u0002"));
});

// ---------------------------------------------------------------------------
// 2. The supported subset actually renders
// ---------------------------------------------------------------------------

const ARTICLE = `# عنوان رئيسي

فقرة افتتاحية فيها **نص عريض** و *نص مائل* ورابط [موعدلي](https://mawedly.com).

## عنوان فرعي

- عنصر أول
- عنصر ثانٍ

1. خطوة أولى
2. خطوة ثانية

> اقتباس مهم عن العربون.

### عنوان ثالث

نص فيه \`كود مضمّن\` داخل الفقرة.

\`\`\`ts
const deposit = 50;
\`\`\`

![مخطط](/charts/no-show.svg)

---

فقرة ختامية.`;

test("full article renders every supported construct", () => {
  const html = assertSafe(ARTICLE, "article");
  const names = new Set(parseTags(html).map((t) => t.name));
  for (const expected of [
    "h2",
    "h3",
    "h4",
    "p",
    "ul",
    "ol",
    "li",
    "blockquote",
    "pre",
    "code",
    "strong",
    "em",
    "a",
    "img",
    "figure",
    "hr",
  ]) {
    assert.ok(names.has(expected), `missing <${expected}> in rendered article`);
  }
});

test("blockquote matches the ESCAPED marker (&gt;), not >", () => {
  const html = renderMarkdown("> اقتباس");
  assert.ok(html.includes("<blockquote>"), "blockquote silently not rendered");
  assert.ok(!html.includes("&gt; اقتباس"));
});

test("headings start at h2 so the page keeps a single h1", () => {
  const html = renderMarkdown("# A\n\n## B\n\n### C");
  const names = parseTags(html).map((t) => t.name);
  assert.ok(!names.includes("h1"));
  assert.ok(names.includes("h2") && names.includes("h3") && names.includes("h4"));
});

test("internal links are not given target=_blank", () => {
  const html = renderMarkdown("[تسعير](/ar/pricing)");
  const link = parseTags(html).find((t) => t.name === "a");
  assert.equal(link?.attrs.href, "/ar/pricing");
  assert.ok(!("target" in (link?.attrs ?? {})));
});

test("external links get noopener", () => {
  const html = renderMarkdown("[x](https://example.com)");
  const link = parseTags(html).find((t) => t.name === "a");
  assert.equal(link?.attrs.rel, "noopener noreferrer");
});

test("ampersands in urls survive as entities", () => {
  const html = renderMarkdown("[x](https://example.com/?a=1&b=2)");
  const link = parseTags(html).find((t) => t.name === "a");
  assert.equal(link?.attrs.href, "https://example.com/?a=1&amp;b=2");
});

test("readingMinutes is floored at one", () => {
  assert.equal(readingMinutes("كلمة"), 1);
  assert.equal(readingMinutes(new Array(400).fill("word").join(" ")), 2);
});
