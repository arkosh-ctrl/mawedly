/**
 * Blog payload validation. Pure: returns an error CODE or null, never throws
 * and never touches I/O — so the API route, the server action and the admin
 * editor all enforce exactly the same rules. If the editor and the server ever
 * disagree, that is a bug in one caller, not two sets of rules.
 */

import {
  BLOG_LOCALES,
  BLOG_STATUSES,
  type BlogLocale,
  type BlogPostInput,
  type BlogStatus,
} from "./types.ts";

/**
 * A published article must carry real prose. "Non-empty" is not enough: a post
 * once went live with a filename as its body because nothing between the editor
 * and the page questioned 21 characters.
 */
export const MIN_CONTENT_LENGTH = 300;

export const MAX_TITLE_LENGTH = 140;
export const MAX_EXCERPT_LENGTH = 320;
export const MAX_SEO_TITLE_LENGTH = 120;
export const MAX_SEO_DESCRIPTION_LENGTH = 320;

/** Soft targets shown as counters in the editor — not enforced. */
export const RECOMMENDED_SEO_TITLE_LENGTH = 60;
export const RECOMMENDED_SEO_DESCRIPTION_LENGTH = 160;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MIN_SLUG_LENGTH = 3;
export const MAX_SLUG_LENGTH = 80;

export type BlogValidationError =
  | "slug_invalid"
  | "status_invalid"
  | "cover_image_invalid"
  | "published_at_required"
  | "published_at_invalid"
  | "translations_empty"
  | "locale_invalid"
  | "locale_duplicate"
  | "locales_incomplete"
  | "title_required"
  | "title_too_long"
  | "excerpt_too_long"
  | "content_too_short"
  | "seo_title_too_long"
  | "seo_description_too_long";

export function isValidSlug(slug: unknown): slug is string {
  return (
    typeof slug === "string" &&
    slug.length >= MIN_SLUG_LENGTH &&
    slug.length <= MAX_SLUG_LENGTH &&
    SLUG_PATTERN.test(slug)
  );
}

export function isBlogStatus(value: unknown): value is BlogStatus {
  return (
    typeof value === "string" &&
    (BLOG_STATUSES as readonly string[]).includes(value)
  );
}

export function isBlogLocale(value: unknown): value is BlogLocale {
  return (
    typeof value === "string" &&
    (BLOG_LOCALES as readonly string[]).includes(value)
  );
}

/** Anything past draft is publicly reachable, so it must be complete. */
function isLive(status: BlogStatus): boolean {
  return status !== "draft";
}

/** Cover images come from our own /public or an https host — same rule as the renderer. */
function isValidImagePath(value: string): boolean {
  return /^https:\/\/[^\s]+$/i.test(value) || /^\/(?!\/)[^\s]*$/.test(value);
}

export function validateBlogPost(
  input: BlogPostInput,
): BlogValidationError | null {
  if (!isValidSlug(input.slug)) return "slug_invalid";
  if (!isBlogStatus(input.status)) return "status_invalid";

  if (
    input.cover_image != null &&
    input.cover_image !== "" &&
    !isValidImagePath(input.cover_image)
  ) {
    return "cover_image_invalid";
  }

  // published_at drives visibility, so it is mandatory the moment a post stops
  // being a draft. Nothing else decides when the article appears.
  if (input.published_at != null && input.published_at !== "") {
    if (Number.isNaN(Date.parse(input.published_at))) {
      return "published_at_invalid";
    }
  } else if (isLive(input.status)) {
    return "published_at_required";
  }

  const translations = input.translations;
  if (!Array.isArray(translations) || translations.length === 0) {
    return "translations_empty";
  }

  const seen = new Set<string>();
  for (const t of translations) {
    if (!isBlogLocale(t?.locale)) return "locale_invalid";
    if (seen.has(t.locale)) return "locale_duplicate";
    seen.add(t.locale);

    const title = typeof t.title === "string" ? t.title.trim() : "";
    if (!title) return "title_required";
    if (title.length > MAX_TITLE_LENGTH) return "title_too_long";

    if ((t.excerpt ?? "").length > MAX_EXCERPT_LENGTH) {
      return "excerpt_too_long";
    }

    const content = typeof t.content === "string" ? t.content.trim() : "";
    if (content.length < MIN_CONTENT_LENGTH) return "content_too_short";

    if ((t.seo_title ?? "").length > MAX_SEO_TITLE_LENGTH) {
      return "seo_title_too_long";
    }
    if ((t.seo_description ?? "").length > MAX_SEO_DESCRIPTION_LENGTH) {
      return "seo_description_too_long";
    }
  }

  // A live post ships in both languages, or hreflang would point at a page that
  // does not exist.
  if (isLive(input.status) && BLOG_LOCALES.some((l) => !seen.has(l))) {
    return "locales_incomplete";
  }

  return null;
}

/** Human-readable reason for a validation code, per UI locale. */
export function validationMessage(
  code: BlogValidationError,
  locale: BlogLocale,
): string {
  const ar: Record<BlogValidationError, string> = {
    slug_invalid: `المُعرّف يجب أن يكون حروفاً لاتينية صغيرة وأرقاماً وشرطات فقط (${MIN_SLUG_LENGTH}–${MAX_SLUG_LENGTH} حرفاً).`,
    status_invalid: "حالة غير معروفة.",
    cover_image_invalid: "رابط صورة الغلاف يجب أن يبدأ بـ https:// أو /.",
    published_at_required: "تاريخ النشر مطلوب لأي حالة غير المسودة.",
    published_at_invalid: "تاريخ النشر غير صالح.",
    translations_empty: "لا توجد أي ترجمة.",
    locale_invalid: "لغة غير مدعومة.",
    locale_duplicate: "لغة مكرّرة.",
    locales_incomplete: "النشر يتطلب النسختين العربية والإنجليزية.",
    title_required: "العنوان مطلوب.",
    title_too_long: `العنوان أطول من ${MAX_TITLE_LENGTH} حرفاً.`,
    excerpt_too_long: `المقتطف أطول من ${MAX_EXCERPT_LENGTH} حرفاً.`,
    content_too_short: `المحتوى أقصر من ${MIN_CONTENT_LENGTH} حرف.`,
    seo_title_too_long: `عنوان SEO أطول من ${MAX_SEO_TITLE_LENGTH} حرفاً.`,
    seo_description_too_long: `وصف SEO أطول من ${MAX_SEO_DESCRIPTION_LENGTH} حرفاً.`,
  };

  const en: Record<BlogValidationError, string> = {
    slug_invalid: `Slug must be lowercase letters, digits and hyphens (${MIN_SLUG_LENGTH}–${MAX_SLUG_LENGTH} chars).`,
    status_invalid: "Unknown status.",
    cover_image_invalid: "Cover image must start with https:// or /.",
    published_at_required: "published_at is required for anything above draft.",
    published_at_invalid: "published_at is not a valid date.",
    translations_empty: "No translations supplied.",
    locale_invalid: "Unsupported locale.",
    locale_duplicate: "Duplicate locale.",
    locales_incomplete: "Publishing requires both Arabic and English.",
    title_required: "Title is required.",
    title_too_long: `Title exceeds ${MAX_TITLE_LENGTH} characters.`,
    excerpt_too_long: `Excerpt exceeds ${MAX_EXCERPT_LENGTH} characters.`,
    content_too_short: `Content is shorter than ${MIN_CONTENT_LENGTH} characters.`,
    seo_title_too_long: `SEO title exceeds ${MAX_SEO_TITLE_LENGTH} characters.`,
    seo_description_too_long: `SEO description exceeds ${MAX_SEO_DESCRIPTION_LENGTH} characters.`,
  };

  return locale === "en" ? en[code] : ar[code];
}
