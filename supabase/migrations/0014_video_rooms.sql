-- ============================================================================
-- Mawedly migration 0014: virtual consultations over meet.jit.si.
--
-- Scope: video rooms only (no chat/notification changes). A room is derived
-- deterministically from the appointment id + ROOM_SECRET in app code
-- (src/lib/video/room-name.ts) — the DB only tracks room state and join times.
--
-- Access model mirrors chat/review: the merchant reads their own rows via RLS
-- (businesses.user_id = auth.uid()); the customer has NO anon policy and reaches
-- the room only through a service_role server path keyed by possession of the
-- appointment id.
--
-- NOTE: this file also (re)creates the session-type foundation from 0011, since
-- some environments were found missing it. All statements are additive and
-- guarded for re-runs.
-- ============================================================================

-- 0. session_type foundation (from 0011; ensured present here).
alter table public.services
  add column if not exists session_type text not null default 'in_person';
alter table public.businesses
  add column if not exists meeting_url text;

-- ----------------------------------------------------------------------------
-- 1. TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.video_rooms (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid unique not null
    references public.appointments(id) on delete cascade,
  -- Derived (HMAC) in app code; stored for lookup/tracking, never a full URL.
  room_name text unique not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'active', 'completed', 'expired', 'canceled')),
  merchant_joined_at timestamptz,
  client_joined_at   timestamptz,
  last_activity_at   timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_video_rooms_appointment
  on public.video_rooms (appointment_id);

-- ----------------------------------------------------------------------------
-- 2. RLS — merchant read-only via ownership join; NO anon policy (service_role
--    carries the customer path and bypasses RLS).
-- ----------------------------------------------------------------------------
alter table public.video_rooms enable row level security;

drop policy if exists "video_rooms_merchant_select" on public.video_rooms;
create policy "video_rooms_merchant_select"
  on public.video_rooms for select to authenticated
  using (
    appointment_id in (
      select a.id from public.appointments a
      join public.businesses b on a.business_id = b.id
      where b.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 3. GRANTS (explicit — SQL-Editor tables aren't auto-granted; see 0003/0012).
-- ----------------------------------------------------------------------------
grant select on public.video_rooms to authenticated;
grant all on public.video_rooms to service_role;

-- ----------------------------------------------------------------------------
-- 4. ACCESS RPC — one SECURITY DEFINER read that decides, in Gulf time, whether
--    the room is open: appointment confirmed, service virtual, and now() within
--    [-5m, +30m] of (appointment_date + start_time). Returns the identities the
--    server needs. EXECUTE is revoked from PUBLIC and granted only to
--    service_role so it can't be called by anon/authenticated over PostgREST.
-- ----------------------------------------------------------------------------
create or replace function public.get_appointment_video_access(
  p_appointment_id uuid,
  p_timezone text default 'Asia/Riyadh'
)
returns table (
  status text, session_type text, merchant_user_id uuid,
  business_name text, customer_name text,
  starts_at timestamptz, is_valid boolean
)
security definer set search_path = public
language sql stable
as $$
  select
    a.status, s.session_type, b.user_id, b.name, c.name,
    ((a.appointment_date + a.start_time) at time zone p_timezone) as starts_at,
    (
      a.status = 'confirmed'
      and s.session_type = 'virtual'
      and now() between
        ((a.appointment_date + a.start_time) at time zone p_timezone) - interval '5 minutes'
        and
        ((a.appointment_date + a.start_time) at time zone p_timezone) + interval '30 minutes'
    ) as is_valid
  from public.appointments a
  join public.services   s on a.service_id  = s.id
  join public.customers  c on a.customer_id = c.id
  join public.businesses b on a.business_id = b.id
  where a.id = p_appointment_id;
$$;

revoke all on function public.get_appointment_video_access(uuid, text) from public;
grant execute on function public.get_appointment_video_access(uuid, text) to service_role;

-- ============================================================================
-- End of migration 0014.
-- ============================================================================
