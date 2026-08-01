-- ============================================================================
-- Mawedly migration 0029: per-language cover image for blog articles.
--
-- blog_posts.cover_image stays as the shared/default cover. This adds an
-- OPTIONAL cover on the translation, because a cover that carries the article
-- title in its artwork can only ever be correct in one language — the Arabic
-- card must show Arabic and the English card must show English, both on the
-- page and in the WhatsApp / LinkedIn share preview.
--
-- Resolution order in the app: translation cover -> post cover -> site icon.
-- Nothing breaks for existing rows: the column is nullable and the post-level
-- cover keeps working exactly as before.
--
-- Idempotent: safe to re-run.
-- ============================================================================

alter table public.blog_post_translations
  add column if not exists cover_image text;

-- No new policies: blog_post_translations already carries the public-read and
-- admin-write policies from 0028, and they apply to every column in the row.
-- No new grants either — the 0028 grants are table-level, not column-level.

-- ============================================================================
-- VERIFY (run after applying):
--
--   select column_name, is_nullable
--     from information_schema.columns
--    where table_schema = 'public'
--      and table_name = 'blog_post_translations'
--      and column_name = 'cover_image';
--   -- expect one row, is_nullable = YES
-- ============================================================================
