-- Mawedly migration 0004: stop exposing full business rows publicly (audit ح-1).
--
-- Problem: the "public can read active businesses" policy applied to ALL roles
-- (anon AND authenticated) with row-level (not column-level) scope. Combined
-- with table-level SELECT grants, any visitor — or any logged-in merchant —
-- could read every active business's bank_iban, bank_account_name,
-- notification_email, phone, user_id, plan, etc.
--
-- Fix: businesses is now owner-only (the "owner manages own business" policy is
-- the only one left, so each user sees just their own row). Public consumers
-- read a column-restricted VIEW that exposes only non-sensitive fields of active
-- businesses. Bank details / email / user_id are never in the view; they will
-- be fetched inside the booking flow via a server route later.

-- 1) Remove the over-broad public read on the base table.
drop policy if exists "public can read active businesses" on public.businesses;

-- 2) Revoke the blanket table read from the anonymous role.
revoke select on public.businesses from anon;

-- 3) Safe public projection. A normal (non-security_invoker) view runs as its
--    owner and bypasses the base table's RLS, so the column list + WHERE clause
--    ARE the access control here. Only active businesses, only safe columns.
create or replace view public.businesses_public as
  select name, slug, type
  from public.businesses
  where is_active = true;

grant select on public.businesses_public to anon, authenticated;
