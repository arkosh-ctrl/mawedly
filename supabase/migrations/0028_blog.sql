-- ============================================================================
-- Mawedly migration 0028: bilingual SEO blog.
--
--   blog_posts             — one row per article (locale-agnostic fields).
--   blog_post_translations — one row per (post, locale) with the content.
--
-- Publication model: a post is PUBLIC when published_at is set and has passed.
-- The policy tests the TIMESTAMP, never the status column — that is what makes
-- scheduling exact without a cron. Pages use revalidate = 300, so a scheduled
-- post goes live within five minutes on its own. Nothing depends on a cron job
-- running (Vercel Hobby caps crons at once per day anyway).
--
-- Access model: public pages read with the ANON key (never service-role), so a
-- careless query cannot leak a draft. Writes go through /api/blog/publish with
-- the service-role client behind a dedicated bearer key, and through /admin
-- where the authenticated admin policies below apply.
--
-- Idempotent: IF NOT EXISTS + DROP POLICY IF EXISTS (migrations are applied via
-- the Supabase SQL Editor and may be re-run).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------
create table if not exists public.blog_posts (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  cover_image   text,
  status        text not null default 'draft'
                  check (status in ('draft', 'scheduled', 'published')),
  -- The single source of truth for visibility. NULL = never published.
  published_at  timestamptz,
  author_id     uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.blog_post_translations (
  id              uuid primary key default gen_random_uuid(),
  post_id         uuid not null references public.blog_posts(id) on delete cascade,
  locale          text not null check (locale in ('ar', 'en')),
  title           text not null,
  excerpt         text not null default '',
  -- Markdown (restricted subset). NEVER raw HTML: the renderer escapes first,
  -- then converts a fixed set of constructs, so stored text cannot become markup.
  content         text not null,
  seo_title       text not null default '',
  seo_description text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (post_id, locale)
);

-- ----------------------------------------------------------------------------
-- 2. INDEXES
-- ----------------------------------------------------------------------------
-- Partial: the public listing only ever scans rows that have a date.
create index if not exists idx_blog_posts_published_at
  on public.blog_posts (published_at desc)
  where published_at is not null;

create index if not exists idx_blog_posts_status
  on public.blog_posts (status);

create index if not exists idx_blog_translations_post_locale
  on public.blog_post_translations (post_id, locale);

-- ----------------------------------------------------------------------------
-- 3. updated_at TRIGGERS
-- ----------------------------------------------------------------------------
create or replace function public.touch_blog_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_blog_posts_updated_at on public.blog_posts;
create trigger trg_blog_posts_updated_at
  before update on public.blog_posts
  for each row execute function public.touch_blog_updated_at();

drop trigger if exists trg_blog_translations_updated_at on public.blog_post_translations;
create trigger trg_blog_translations_updated_at
  before update on public.blog_post_translations
  for each row execute function public.touch_blog_updated_at();

-- ----------------------------------------------------------------------------
-- 4. RLS
--
-- Public read tests published_at only. A row whose published_at is in the
-- future is invisible to anon/authenticated until that instant passes — no job
-- flips anything. Translations inherit visibility from their parent post.
--
-- Admin access reuses public.is_platform_admin() from migration 0016 (this
-- project identifies admins via the `admins` table, NOT a users.role column).
-- ----------------------------------------------------------------------------
alter table public.blog_posts             enable row level security;
alter table public.blog_post_translations enable row level security;

drop policy if exists "public read live posts" on public.blog_posts;
create policy "public read live posts"
  on public.blog_posts for select to anon, authenticated
  using (published_at is not null and published_at <= now());

drop policy if exists "public read live translations" on public.blog_post_translations;
create policy "public read live translations"
  on public.blog_post_translations for select to anon, authenticated
  using (
    exists (
      select 1 from public.blog_posts p
      where p.id = blog_post_translations.post_id
        and p.published_at is not null
        and p.published_at <= now()
    )
  );

-- Admins see and manage everything, including drafts and future-dated posts.
drop policy if exists "admins read all posts" on public.blog_posts;
create policy "admins read all posts"
  on public.blog_posts for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "admins write posts" on public.blog_posts;
create policy "admins write posts"
  on public.blog_posts for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "admins read all translations" on public.blog_post_translations;
create policy "admins read all translations"
  on public.blog_post_translations for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "admins write translations" on public.blog_post_translations;
create policy "admins write translations"
  on public.blog_post_translations for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ----------------------------------------------------------------------------
-- 5. GRANTS
-- Tables created via the SQL Editor are NOT auto-granted to anon/authenticated,
-- so even with permissive RLS they return 42501 "permission denied for table"
-- (see 0003 / 0016). RLS still governs WHICH ROWS each role may touch.
-- ----------------------------------------------------------------------------
grant select on public.blog_posts             to anon;
grant select on public.blog_post_translations to anon;

grant select, insert, update, delete on public.blog_posts             to authenticated;
grant select, insert, update, delete on public.blog_post_translations to authenticated;

grant select, insert, update, delete on public.blog_posts             to service_role;
grant select, insert, update, delete on public.blog_post_translations to service_role;

-- ============================================================================
-- VERIFY (run manually after applying):
--
--   -- both tables exist
--   select table_name from information_schema.tables
--    where table_schema = 'public' and table_name like 'blog_%';
--
--   -- a future-dated post must be invisible to anon:
--   insert into public.blog_posts (slug, status, published_at)
--   values ('rls-probe', 'scheduled', now() + interval '1 day');
--
--   set local role anon;
--   select count(*) from public.blog_posts where slug = 'rls-probe';  -- expect 0
--   reset role;
--
--   delete from public.blog_posts where slug = 'rls-probe';
-- ============================================================================
-- End of migration 0028.
-- ============================================================================
