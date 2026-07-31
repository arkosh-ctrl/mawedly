import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { withBlog, type BlogClient } from "./db";
import { readingMinutes } from "./markdown";
import type {
  BlogListItem,
  BlogLocale,
  BlogPostRow,
  BlogTranslation,
} from "./types";

/**
 * Public blog reads.
 *
 * ANON KEY ONLY — never the service role. RLS already restricts anonymous
 * reads to rows whose published_at has passed, so keeping the privileged key
 * out of these pages means a careless query cannot leak a draft.
 *
 * This client is cookie-free on purpose: a cookie-reading client would opt the
 * page into dynamic rendering and defeat `revalidate`.
 */
function publicClient(): BlogClient {
  const client = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return withBlog(client);
}

/**
 * Every read returns an explicit outcome. A failed query must NEVER surface as
 * an empty state: "no posts yet" when the query actually errored reads as data
 * loss, and nobody investigates a page that looks merely quiet.
 */
export type BlogQueryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type TranslationRow = BlogTranslation & { post_id: string };

export async function getPublishedPosts(
  locale: BlogLocale,
): Promise<BlogQueryResult<BlogListItem[]>> {
  const db = publicClient();

  const { data: posts, error } = await db
    .from("blog_posts")
    .select("id, slug, cover_image, published_at")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  if (error) return { ok: false, error: error.message };
  if (!posts || posts.length === 0) return { ok: true, data: [] };

  const { data: translations, error: trError } = await db
    .from("blog_post_translations")
    .select("post_id, locale, title, excerpt, content, seo_title, seo_description")
    .in(
      "post_id",
      posts.map((p) => p.id),
    );

  if (trError) return { ok: false, error: trError.message };

  const byPost = new Map<string, TranslationRow[]>();
  for (const t of (translations ?? []) as TranslationRow[]) {
    byPost.set(t.post_id, [...(byPost.get(t.post_id) ?? []), t]);
  }

  const items: BlogListItem[] = [];
  for (const post of posts) {
    const all = byPost.get(post.id) ?? [];
    const match = all.find((t) => t.locale === locale);
    // A post with no translation in this locale simply isn't listed here.
    if (!match) continue;
    items.push({
      slug: post.slug,
      title: match.title,
      excerpt: match.excerpt,
      cover_image: post.cover_image,
      published_at: post.published_at as string,
      readingMinutes: readingMinutes(match.content),
      locales: all.map((t) => t.locale),
    });
  }

  return { ok: true, data: items };
}

export type BlogArticle = {
  post: Pick<BlogPostRow, "slug" | "cover_image" | "published_at" | "updated_at">;
  translation: BlogTranslation;
  /** Locales that actually exist for this post — hreflang must not invent any. */
  locales: BlogLocale[];
  readingMinutes: number;
};

export async function getPublishedPost(
  slug: string,
  locale: BlogLocale,
): Promise<BlogQueryResult<BlogArticle | null>> {
  const db = publicClient();

  const { data: post, error } = await db
    .from("blog_posts")
    .select("id, slug, cover_image, published_at, updated_at")
    .eq("slug", slug)
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!post) return { ok: true, data: null };

  const { data: translations, error: trError } = await db
    .from("blog_post_translations")
    .select("post_id, locale, title, excerpt, content, seo_title, seo_description")
    .eq("post_id", post.id);

  if (trError) return { ok: false, error: trError.message };

  const rows = (translations ?? []) as TranslationRow[];
  const match = rows.find((t) => t.locale === locale);
  if (!match) return { ok: true, data: null };

  return {
    ok: true,
    data: {
      post: {
        slug: post.slug,
        cover_image: post.cover_image,
        published_at: post.published_at,
        updated_at: post.updated_at,
      },
      translation: {
        locale: match.locale,
        title: match.title,
        excerpt: match.excerpt,
        content: match.content,
        seo_title: match.seo_title,
        seo_description: match.seo_description,
      },
      locales: rows.map((t) => t.locale),
      readingMinutes: readingMinutes(match.content),
    },
  };
}

export type BlogSlugEntry = {
  slug: string;
  published_at: string;
  updated_at: string;
  locales: BlogLocale[];
};

/** Live posts with the locales they exist in — used by the sitemap. */
export async function getPublishedSlugs(): Promise<
  BlogQueryResult<BlogSlugEntry[]>
> {
  const db = publicClient();

  const { data: posts, error } = await db
    .from("blog_posts")
    .select("id, slug, published_at, updated_at")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  if (error) return { ok: false, error: error.message };
  if (!posts || posts.length === 0) return { ok: true, data: [] };

  const { data: translations, error: trError } = await db
    .from("blog_post_translations")
    .select("post_id, locale")
    .in(
      "post_id",
      posts.map((p) => p.id),
    );

  if (trError) return { ok: false, error: trError.message };

  const byPost = new Map<string, BlogLocale[]>();
  for (const t of (translations ?? []) as { post_id: string; locale: BlogLocale }[]) {
    byPost.set(t.post_id, [...(byPost.get(t.post_id) ?? []), t.locale]);
  }

  return {
    ok: true,
    data: posts.map((p) => ({
      slug: p.slug,
      published_at: p.published_at as string,
      updated_at: p.updated_at,
      locales: byPost.get(p.id) ?? [],
    })),
  };
}
