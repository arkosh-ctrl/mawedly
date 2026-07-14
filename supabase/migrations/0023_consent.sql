-- Explicit consent capture at signup (PDPL). terms_accepted_at is stamped when
-- the merchant ticks the mandatory Terms + Privacy + Disclaimer box;
-- marketing_consent records the optional notifications opt-in.
-- Table-level grants already cover new columns.
alter table public.businesses
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists marketing_consent boolean not null default false;
