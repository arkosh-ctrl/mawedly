import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { withBlog } from "./db";
import { validateBlogPost, type BlogValidationError } from "./validate";
import type {
  BlogLocale,
  BlogPostInput,
  BlogPostWithTranslations,
  BlogTranslation,
} from "./types";

// Business logic for creating and updating posts. Lives in lib/ (not in the
// route file) so both the publishing API and the admin server actions run the
// SAME code path — and so route.ts can export nothing but HTTP verbs, which is
// a hard Next.js requirement that `tsc --noEmit` does not catch.

export type WriteResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; error: BlogValidationError | "slug_taken" | "not_found" | "db_error"; detail?: string };

/** Payload for PATCH: everything optional except the identifier. */
export type BlogPostPatch = Partial<Omit<BlogPostInput, "translations">> & {
  translations?: BlogTranslation[];
};

function normaliseTranslation(t: BlogTranslation): BlogTranslation {
  return {
    locale: t.locale,
    title: t.title.trim(),
    excerpt: (t.excerpt ?? "").trim(),
    content: t.content.trim(),
    seo_title: (t.seo_title ?? "").trim(),
    seo_description: (t.seo_description ?? "").trim(),
    cover_image: t.cover_image?.trim() || null,
  };
}

async function replaceTranslations(
  postId: string,
  translations: BlogTranslation[],
): Promise<string | null> {
  const db = withBlog(createAdminClient());
  const { error } = await db.from("blog_post_translations").upsert(
    translations.map((t) => ({ post_id: postId, ...normaliseTranslation(t) })),
    { onConflict: "post_id,locale" },
  );
  return error ? error.message : null;
}

export async function createBlogPost(
  input: BlogPostInput,
  authorId: string | null = null,
): Promise<WriteResult> {
  const invalid = validateBlogPost(input);
  if (invalid) return { ok: false, error: invalid };

  const db = withBlog(createAdminClient());

  const { data: post, error } = await db
    .from("blog_posts")
    .insert({
      slug: input.slug,
      cover_image: input.cover_image || null,
      status: input.status,
      published_at: input.published_at || null,
      author_id: authorId,
    })
    .select("id, slug")
    .single();

  if (error || !post) {
    // 23505 = unique_violation on blog_posts.slug
    if (error?.code === "23505") return { ok: false, error: "slug_taken" };
    return { ok: false, error: "db_error", detail: error?.message };
  }

  const trError = await replaceTranslations(post.id, input.translations);
  if (trError) {
    // Don't leave a post with no body behind.
    await db.from("blog_posts").delete().eq("id", post.id);
    return { ok: false, error: "db_error", detail: trError };
  }

  return { ok: true, id: post.id, slug: post.slug };
}

/**
 * Update a post identified by id or current slug.
 *
 * published_at is only written when the caller explicitly supplies the key. A
 * PATCH that omits it KEEPS the stored value: because the public policy tests
 * published_at, writing null here would make a live article silently vanish
 * from the site.
 */
export async function updateBlogPost(
  identifier: { id?: string; slug?: string },
  patch: BlogPostPatch,
): Promise<WriteResult> {
  const db = withBlog(createAdminClient());

  let query = db
    .from("blog_posts")
    .select("id, slug, cover_image, status, published_at");
  query = identifier.id
    ? query.eq("id", identifier.id)
    : query.eq("slug", identifier.slug ?? "");

  const { data: existing, error: findError } = await query.maybeSingle();
  if (findError) {
    return { ok: false, error: "db_error", detail: findError.message };
  }
  if (!existing) return { ok: false, error: "not_found" };

  const { data: currentTranslations, error: trReadError } = await db
    .from("blog_post_translations")
    .select("locale, title, excerpt, content, seo_title, seo_description, cover_image")
    .eq("post_id", existing.id);
  if (trReadError) {
    return { ok: false, error: "db_error", detail: trReadError.message };
  }

  const merged = new Map<BlogLocale, BlogTranslation>();
  for (const t of currentTranslations ?? []) merged.set(t.locale, t);
  for (const t of patch.translations ?? []) {
    merged.set(t.locale, normaliseTranslation(t));
  }

  const next: BlogPostInput = {
    slug: patch.slug ?? existing.slug,
    cover_image:
      patch.cover_image !== undefined ? patch.cover_image : existing.cover_image,
    status: patch.status ?? existing.status,
    published_at:
      patch.published_at !== undefined
        ? patch.published_at
        : existing.published_at,
    translations: [...merged.values()],
  };

  const invalid = validateBlogPost(next);
  if (invalid) return { ok: false, error: invalid };

  const { error: updateError } = await db
    .from("blog_posts")
    .update({
      slug: next.slug,
      cover_image: next.cover_image || null,
      status: next.status,
      published_at: next.published_at || null,
    })
    .eq("id", existing.id);

  if (updateError) {
    if (updateError.code === "23505") return { ok: false, error: "slug_taken" };
    return { ok: false, error: "db_error", detail: updateError.message };
  }

  if (patch.translations?.length) {
    const trError = await replaceTranslations(existing.id, patch.translations);
    if (trError) return { ok: false, error: "db_error", detail: trError };
  }

  return { ok: true, id: existing.id, slug: next.slug };
}

/** One post with every translation — drafts included. Admin surfaces only. */
export async function getBlogPostById(
  id: string,
): Promise<
  | { ok: true; post: BlogPostWithTranslations | null }
  | { ok: false; error: string }
> {
  const db = withBlog(createAdminClient());

  const { data: post, error } = await db
    .from("blog_posts")
    .select(
      "id, slug, cover_image, status, published_at, author_id, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!post) return { ok: true, post: null };

  const { data: translations, error: trError } = await db
    .from("blog_post_translations")
    .select("locale, title, excerpt, content, seo_title, seo_description, cover_image")
    .eq("post_id", post.id);

  if (trError) return { ok: false, error: trError.message };

  return {
    ok: true,
    post: {
      ...post,
      translations: (translations ?? []).map((t) => ({
        locale: t.locale,
        title: t.title,
        excerpt: t.excerpt,
        content: t.content,
        seo_title: t.seo_title,
        seo_description: t.seo_description,
        cover_image: t.cover_image,
      })),
    },
  };
}

/** Every post, drafts included — for the API listing and the admin table. */
export async function listAllBlogPosts(): Promise<
  { ok: true; posts: BlogPostWithTranslations[] } | { ok: false; error: string }
> {
  const db = withBlog(createAdminClient());

  const { data: posts, error } = await db
    .from("blog_posts")
    .select(
      "id, slug, cover_image, status, published_at, author_id, created_at, updated_at",
    )
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: error.message };

  const ids = (posts ?? []).map((p) => p.id);
  if (ids.length === 0) return { ok: true, posts: [] };

  const { data: translations, error: trError } = await db
    .from("blog_post_translations")
    .select("post_id, locale, title, excerpt, content, seo_title, seo_description, cover_image")
    .in("post_id", ids);

  if (trError) return { ok: false, error: trError.message };

  const byPost = new Map<string, BlogTranslation[]>();
  for (const t of translations ?? []) {
    const list = byPost.get(t.post_id) ?? [];
    list.push({
      locale: t.locale,
      title: t.title,
      excerpt: t.excerpt,
      content: t.content,
      seo_title: t.seo_title,
      seo_description: t.seo_description,
      cover_image: t.cover_image,
    });
    byPost.set(t.post_id, list);
  }

  return {
    ok: true,
    posts: (posts ?? []).map((p) => ({
      ...p,
      translations: byPost.get(p.id) ?? [],
    })),
  };
}
