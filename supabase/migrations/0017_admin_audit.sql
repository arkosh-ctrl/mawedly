-- ============================================================================
-- Mawedly migration 0017: admin action audit log (Phase 2).
--
-- Records every management action a platform admin performs (e.g. suspending a
-- business), for accountability and PDPL. Read by admins in /admin/audit;
-- written only by the service-role path AFTER an app-side admin check.
-- ============================================================================

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete set null,
  action text not null,            -- 'activate_business' | 'suspend_business' | ...
  target_type text not null,       -- 'business' | ...
  target_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_actions_created
  on public.admin_actions (created_at desc);

alter table public.admin_actions enable row level security;

drop policy if exists "admins read audit log" on public.admin_actions;
create policy "admins read audit log"
  on public.admin_actions for select to authenticated
  using (public.is_platform_admin());

grant select on public.admin_actions to authenticated;
grant select, insert on public.admin_actions to service_role;

-- ============================================================================
-- End of migration 0017.
-- ============================================================================
