-- 0019: Social share (V1, intent-based — no OAuth, no tokens).
-- 1) business_social_links: the merchant's public social profiles, managed in
--    /dashboard/social and rendered as icons on the public booking page.
-- 2) social_shares: a lightweight log of "review X was shared to platform Y"
--    for the merchant's own stats. No engagement analytics in V1.
--
-- Security model mirrors the rest of the schema: RLS scopes everything to the
-- owner via businesses.user_id = auth.uid(); the public booking page reads
-- through the service_role client (businesses are not anon-readable since
-- 0004), so no anon policies exist. Explicit GRANTs are required for tables
-- created via the SQL Editor (see 0003).

create table public.business_social_links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  platform text not null check (
    platform in ('instagram', 'x', 'tiktok', 'snapchat', 'facebook', 'linkedin', 'youtube')
  ),
  url text not null check (url like 'https://%'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, platform)
);

create table public.social_shares (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  review_id uuid not null references public.reviews(id) on delete cascade,
  platform text not null check (
    platform in ('whatsapp', 'x', 'telegram', 'snapchat', 'facebook', 'linkedin', 'instagram', 'native')
  ),
  created_at timestamptz not null default now()
);

create index idx_business_social_links_business
  on public.business_social_links (business_id);
create index idx_social_shares_business
  on public.social_shares (business_id);
create index idx_social_shares_review
  on public.social_shares (review_id);

alter table public.business_social_links enable row level security;
alter table public.social_shares enable row level security;

-- Owner-only, both tables (same ownership predicate as services/providers).
create policy "owner manages own social links"
  on public.business_social_links
  for all
  to authenticated
  using (
    business_id in (select id from public.businesses where user_id = auth.uid())
  )
  with check (
    business_id in (select id from public.businesses where user_id = auth.uid())
  );

create policy "owner manages own share log"
  on public.social_shares
  for all
  to authenticated
  using (
    business_id in (select id from public.businesses where user_id = auth.uid())
  )
  with check (
    business_id in (select id from public.businesses where user_id = auth.uid())
  );

-- Explicit grants (RLS still applies to authenticated; service_role bypasses
-- RLS and needs select for the public booking page render).
grant select, insert, update, delete on public.business_social_links to authenticated;
grant select on public.business_social_links to service_role;
grant select, insert, delete on public.social_shares to authenticated;
