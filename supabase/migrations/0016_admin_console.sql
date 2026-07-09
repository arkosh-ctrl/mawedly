-- ============================================================================
-- Mawedly migration 0016: platform admin console + observability (Phase 1).
--
-- Two new tables, fully isolated from the merchant-facing schema:
--   admins        — who may access /admin, and at what role.
--   system_events — an in-app log of subsystem successes/failures for the
--                   health monitor (email, cron, booking, notifications, ...).
--
-- Access model: the /admin pages resolve data with the service-role client
-- AFTER an app-side requireAdmin() check, so RLS here is a second layer. The
-- SECURITY DEFINER helper avoids policy recursion on the admins table.
--
-- PDPL: system_events.meta must never carry raw PII (store ids/refs only).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.system_events (
  id uuid primary key default gen_random_uuid(),
  scope text not null,            -- 'email' | 'cron_reminders' | 'booking_api' | 'notifications' | 'video' | 'calendar' | 'deposit'
  event text not null,
  level text not null check (level in ('info', 'warn', 'error')),
  meta jsonb not null default '{}'::jsonb,   -- refs only, NO raw PII
  business_id uuid,               -- optional link to a business (no FK: keep logs even if the business is deleted)
  created_at timestamptz not null default now()
);

create index if not exists idx_system_events_scope_created
  on public.system_events (scope, created_at desc);
create index if not exists idx_system_events_level_created
  on public.system_events (level, created_at desc);

-- ----------------------------------------------------------------------------
-- 2. ADMIN CHECK (SECURITY DEFINER — bypasses RLS, so the admins policy below
--    doesn't recurse; search_path pinned per the 0009/0012 hardening).
-- ----------------------------------------------------------------------------
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

-- ----------------------------------------------------------------------------
-- 3. RLS — admins read both tables; all writes go through service_role.
-- ----------------------------------------------------------------------------
alter table public.admins        enable row level security;
alter table public.system_events enable row level security;

drop policy if exists "admins read admin list" on public.admins;
create policy "admins read admin list"
  on public.admins for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "admins read system events" on public.system_events;
create policy "admins read system events"
  on public.system_events for select to authenticated
  using (public.is_platform_admin());

-- ----------------------------------------------------------------------------
-- 4. GRANTS (SQL-Editor tables aren't auto-granted; see 0003 / 0012 — missing
--    grants surface as 42501 even with permissive RLS).
-- ----------------------------------------------------------------------------
grant select on public.admins to authenticated;
grant select on public.system_events to authenticated;
grant select, insert, update, delete on public.admins to service_role;
grant select, insert, delete on public.system_events to service_role;

-- ----------------------------------------------------------------------------
-- 5. SEED — make the founder the first platform admin (idempotent).
-- ----------------------------------------------------------------------------
insert into public.admins (user_id, role)
select id, 'admin' from auth.users where email = 'arkosh@live.com'
on conflict (user_id) do nothing;

-- ============================================================================
-- End of migration 0016.
-- ============================================================================
