-- ============================================================================
-- Mawedly migration 0009: internal post-appointment reviews (Phase 1).
--
-- A merchant-internal rating system. One review per appointment, submittable
-- ONLY after that appointment is 'completed', by an unauthenticated visitor who
-- follows an emailed link. The public review page exposes NO appointment data;
-- only the owning merchant reads aggregated results in the dashboard.
--
-- Re-runnable: guarded with IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS,
-- matching the style of the existing migrations.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE
-- ----------------------------------------------------------------------------
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments(id) on delete cascade not null,
  business_id uuid references businesses(id) on delete cascade not null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  -- One review per appointment (decisions 1 + 7ب). A duplicate raises 23505.
  unique (appointment_id)
);

-- Owner dashboard lists newest-first, scoped to a business.
create index if not exists reviews_business_created_idx
  on reviews (business_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 2. SECURITY DEFINER helper used by the INSERT policy's WITH CHECK.
--    The public insert runs as `anon`, which has NO read access to appointments
--    (owner-only RLS). A plain subquery against appointments inside WITH CHECK
--    would therefore always see zero rows and reject every insert. Running as
--    the function owner bypasses RLS for this single boolean check, so the
--    policy can verify status WITHOUT granting anon any visibility into
--    appointments. search_path is pinned (required SECURITY DEFINER hardening).
-- ----------------------------------------------------------------------------
create or replace function public.review_target_is_completed(p_appointment_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from appointments
    where id = p_appointment_id and status = 'completed'
  );
$$;

-- CREATE FUNCTION grants EXECUTE to PUBLIC by default; lock it down to the two
-- roles that actually evaluate the policy.
revoke all on function public.review_target_is_completed(uuid) from public;
grant execute on function public.review_target_is_completed(uuid) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. SECURITY DEFINER trigger: derive business_id from the real appointment so
--    the visitor never supplies it; any crafted business_id is OVERWRITTEN, so a
--    review can never be attributed to the wrong business. Re-checks 'completed'
--    as order-independent defense in depth. Not directly exploitable outside the
--    trigger (it returns trigger and depends on NEW), so default privileges are
--    left as-is.
-- ----------------------------------------------------------------------------
create or replace function public.reviews_set_business_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  appt record;
begin
  select business_id, status into appt
    from appointments where id = NEW.appointment_id;
  if appt is null or appt.status <> 'completed' then
    raise exception 'review not allowed for this appointment';
  end if;
  NEW.business_id := appt.business_id;
  return NEW;
end;
$$;

drop trigger if exists trigger_reviews_set_business_id on reviews;
create trigger trigger_reviews_set_business_id
  before insert on reviews
  for each row execute function public.reviews_set_business_id();

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table reviews enable row level security;

-- Public (anon + authenticated) may INSERT a review ONLY for a completed
-- appointment. "No prior review" is enforced by UNIQUE(appointment_id) above.
-- business_id is set by the trigger, never trusted from the client.
drop policy if exists "public submits review for completed appointment" on reviews;
create policy "public submits review for completed appointment"
  on reviews for insert
  to anon, authenticated
  with check ( public.review_target_is_completed(appointment_id) );

-- Owner reads only their own business's reviews (same ownership pattern as
-- appointments / customers in migration 0001).
drop policy if exists "owner reads own reviews" on reviews;
create policy "owner reads own reviews"
  on reviews for select
  to authenticated
  using ( business_id in (select id from businesses where user_id = auth.uid()) );

-- (No UPDATE / DELETE policies: reviews are immutable in Phase 1.)

-- ----------------------------------------------------------------------------
-- 5. GRANTS — SQL-Editor-created tables are NOT auto-granted to anon/
--    authenticated, so even with permissive RLS they would fail with 42501
--    "permission denied for table" (see migration 0003). RLS still governs which
--    ROWS each role may touch; these grants govern table-level access.
--    No service_role grant: there is no server-role path to reviews in Phase 1.
-- ----------------------------------------------------------------------------
grant insert on public.reviews to anon;                   -- public review submission
grant select, insert on public.reviews to authenticated;  -- owner read; logged-in submit

-- ============================================================================
-- End of migration 0009.
-- ============================================================================
