-- 0030 — first-touch signup attribution on businesses.
--
-- Four nullable text columns recording where a merchant came from, written
-- once by signupAction at row creation and never updated afterwards.
--
-- WHY COLUMNS AND NOT A TABLE
-- The relationship is strictly one-to-one with a business and the values never
-- change, so a side table would buy nothing but a join on every admin read
-- plus its own RLS policies and grants.
--
-- SECURITY
-- No new policy or GRANT is needed: migration 0003 granted on the businesses
-- TABLE (not per column), so new columns inherit those grants, and the existing
-- owner-only RLS policies already scope every read and write. These values are
-- never exposed on any public page.
--
-- PRIVACY (PDPL)
-- signup_referrer holds a HOST only ("linkedin.com"), never a full URL — a full
-- referrer can carry search terms or identifiers from the other site. Nothing
-- stored here identifies a person.

alter table public.businesses
  add column if not exists signup_source   text,
  add column if not exists signup_medium   text,
  add column if not exists signup_campaign text,
  add column if not exists signup_referrer text;

-- Length guards mirroring the 64-char cap the zod schema applies, so a direct
-- SQL write cannot store what the application would have rejected.
alter table public.businesses
  drop constraint if exists businesses_signup_attr_len;

alter table public.businesses
  add constraint businesses_signup_attr_len check (
    coalesce(length(signup_source), 0)   <= 64 and
    coalesce(length(signup_medium), 0)   <= 64 and
    coalesce(length(signup_campaign), 0) <= 64 and
    coalesce(length(signup_referrer), 0) <= 64
  );

-- Partial index: the admin view groups by source, and rows with no attribution
-- (every business created before this migration) are the majority and are never
-- grouped on.
create index if not exists businesses_signup_source_idx
  on public.businesses (signup_source)
  where signup_source is not null;

comment on column public.businesses.signup_source is
  'First-touch acquisition source (utm_source, ?ref, or referring host). Set once at signup, never updated.';
