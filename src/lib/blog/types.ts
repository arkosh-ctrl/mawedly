// Shared blog types. Kept free of "server-only" so the admin editor (a client
// component) can import the same shapes the API route validates against.

export const BLOG_LOCALES = ["ar", "en"] as const;
export type BlogLocale = (typeof BLOG_LOCALES)[number];

export const BLOG_STATUSES = ["draft", "scheduled", "published"] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

/** A single-language rendition of a post. */
export type BlogTranslation = {
  locale: BlogLocale;
  title: string;
  excerpt: string;
  /** Markdown in the restricted subset — never HTML. */
  content: string;
  /**
   * Optional cover for THIS language. A cover whose artwork carries the title
   * can only be right in one language, so it belongs on the translation.
   * Falls back to the post-level cover when absent.
   */
  cover_image?: string | null;
  seo_title: string;
  seo_description: string;
};

/** Row shape as stored in blog_posts. */
export type BlogPostRow = {
  id: string;
  slug: string;
  cover_image: string | null;
  status: BlogStatus;
  published_at: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
};

/** A post plus every translation that exists for it. */
export type BlogPostWithTranslations = BlogPostRow & {
  translations: BlogTranslation[];
};

/** What the public list page needs — one locale, no body. */
export type BlogListItem = {
  slug: string;
  title: string;
  excerpt: string;
  cover_image: string | null;
  published_at: string;
  readingMinutes: number;
  /** Locales that actually have a translation, for hreflang. */
  locales: BlogLocale[];
};

/** Payload accepted by /api/blog/publish and by the admin editor. */
export type BlogPostInput = {
  slug: string;
  cover_image?: string | null;
  status: BlogStatus;
  /** ISO 8601. Required for anything above draft. */
  published_at?: string | null;
  translations: BlogTranslation[];
};
