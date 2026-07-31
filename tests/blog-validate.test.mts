// Direct unit tests for the blog validator — every failure case called by hand.
// Run with:  npm run test:blog

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateBlogPost,
  isValidSlug,
  MIN_CONTENT_LENGTH,
} from "../src/lib/blog/validate.ts";
import type {
  BlogPostInput,
  BlogTranslation,
  BlogLocale,
} from "../src/lib/blog/types.ts";

const BODY = "أ".repeat(MIN_CONTENT_LENGTH + 20);

function tr(locale: BlogLocale, over: Partial<BlogTranslation> = {}) {
  return {
    locale,
    title: "عنوان",
    excerpt: "مقتطف",
    content: BODY,
    seo_title: "seo",
    seo_description: "desc",
    ...over,
  } satisfies BlogTranslation;
}

function post(over: Partial<BlogPostInput> = {}): BlogPostInput {
  return {
    slug: "how-deposits-cut-no-shows",
    status: "published",
    published_at: "2026-07-31T09:00:00.000Z",
    translations: [tr("ar"), tr("en")],
    ...over,
  };
}

test("a complete published post is accepted", () => {
  assert.equal(validateBlogPost(post()), null);
});

test("slug format", () => {
  assert.ok(isValidSlug("a-b-1"));
  assert.ok(!isValidSlug("ab"));
  assert.ok(!isValidSlug("Has-Upper"));
  assert.ok(!isValidSlug("trailing-"));
  assert.ok(!isValidSlug("double--hyphen"));
  assert.ok(!isValidSlug("has space"));
  assert.ok(!isValidSlug("عربي"));
  assert.ok(!isValidSlug("a".repeat(81)));
  assert.equal(validateBlogPost(post({ slug: "Bad Slug" })), "slug_invalid");
});

test("unknown status is rejected", () => {
  assert.equal(
    validateBlogPost(post({ status: "live" as never })),
    "status_invalid",
  );
});

test("published_at is required above draft but not for a draft", () => {
  assert.equal(
    validateBlogPost(post({ status: "scheduled", published_at: null })),
    "published_at_required",
  );
  assert.equal(
    validateBlogPost(post({ status: "published", published_at: "" })),
    "published_at_required",
  );
  assert.equal(
    validateBlogPost(
      post({
        status: "draft",
        published_at: null,
        translations: [tr("ar")],
      }),
    ),
    null,
  );
});

test("unparseable published_at is rejected", () => {
  assert.equal(
    validateBlogPost(post({ published_at: "next tuesday" })),
    "published_at_invalid",
  );
});

test("both locales are required above draft", () => {
  assert.equal(
    validateBlogPost(post({ translations: [tr("ar")] })),
    "locales_incomplete",
  );
  assert.equal(
    validateBlogPost(post({ translations: [tr("en")] })),
    "locales_incomplete",
  );
});

test("locale problems", () => {
  assert.equal(
    validateBlogPost(post({ translations: [tr("fr" as never), tr("en")] })),
    "locale_invalid",
  );
  assert.equal(
    validateBlogPost(post({ translations: [tr("ar"), tr("ar")] })),
    "locale_duplicate",
  );
  assert.equal(validateBlogPost(post({ translations: [] })), "translations_empty");
});

test("short content is rejected — 'non-empty' is not enough", () => {
  assert.equal(
    validateBlogPost(
      post({ translations: [tr("ar", { content: "chart.svg" }), tr("en")] }),
    ),
    "content_too_short",
  );
  assert.equal(
    validateBlogPost(
      post({
        translations: [
          tr("ar", { content: "x".repeat(MIN_CONTENT_LENGTH - 1) }),
          tr("en"),
        ],
      }),
    ),
    "content_too_short",
  );
});

test("empty title is rejected", () => {
  assert.equal(
    validateBlogPost(post({ translations: [tr("ar", { title: "   " }), tr("en")] })),
    "title_required",
  );
});

test("over-long fields are rejected", () => {
  assert.equal(
    validateBlogPost(
      post({ translations: [tr("ar", { title: "x".repeat(141) }), tr("en")] }),
    ),
    "title_too_long",
  );
  assert.equal(
    validateBlogPost(
      post({ translations: [tr("ar", { excerpt: "x".repeat(321) }), tr("en")] }),
    ),
    "excerpt_too_long",
  );
  assert.equal(
    validateBlogPost(
      post({ translations: [tr("ar", { seo_title: "x".repeat(121) }), tr("en")] }),
    ),
    "seo_title_too_long",
  );
  assert.equal(
    validateBlogPost(
      post({
        translations: [tr("ar", { seo_description: "x".repeat(321) }), tr("en")],
      }),
    ),
    "seo_description_too_long",
  );
});

test("cover image must be https or root-relative", () => {
  assert.equal(validateBlogPost(post({ cover_image: "/covers/a.jpg" })), null);
  assert.equal(
    validateBlogPost(post({ cover_image: "https://cdn.example/a.jpg" })),
    null,
  );
  assert.equal(
    validateBlogPost(post({ cover_image: "javascript:alert(1)" })),
    "cover_image_invalid",
  );
  assert.equal(
    validateBlogPost(post({ cover_image: "//evil.example/a.jpg" })),
    "cover_image_invalid",
  );
  assert.equal(validateBlogPost(post({ cover_image: null })), null);
});
