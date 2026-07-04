-- ============================================================================
-- Mawedly migration 0013: in-app notification center for the MERCHANT.
--
-- Scope (V1): merchant-only, in-app notifications. Customers are notified by
-- email (existing system) and are intentionally out of scope here — so there
-- is no recipient_type/recipient_id polymorphism. Ownership follows the same
-- model as every other table in this schema: rows belong to a business, and
-- access is gated through businesses.user_id = auth.uid() (NOT auth.uid()
-- directly — businesses.id is a separate uuid).
--
-- Architecture: Supabase Realtime (postgres_changes) delivers new rows to the
-- merchant's bell; scheduled reminders are inserted by a service_role cron
-- route. A UNIQUE partial index on (source_id, type) makes reminder inserts
-- idempotent, so the cron can run every few minutes without duplicating.
--
-- Re-runnable: guarded with IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS,
-- matching the style of the existing migrations.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

-- 1.1 NOTIFICATIONS
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  -- Owner of the notification. business_id (not auth.uid) mirrors every other
  -- table; RLS resolves ownership via businesses.user_id below.
  business_id uuid references businesses(id) on delete cascade not null,

  -- Source of the event.
  source_type text not null
    check (source_type in ('appointment', 'chat_message', 'payment', 'review', 'system')),
  source_id uuid,                               -- appointment_id / chat_message_id / review_id / null

  -- Event type.
  type text not null check (type in (
    'new_booking',
    'reminder_1h',
    'reminder_30m',
    'reminder_15m',
    'new_chat_message',
    'appointment_cancelled',
    'appointment_rescheduled',
    'appointment_completed',
    'no_show',
    'payment_received',
    'payment_failed',
    'new_review',
    'system_announcement'
  )),

  -- Content (already localized by the caller at write time).
  title text not null,
  message text not null,

  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'unread'
    check (status in ('unread', 'read', 'archived')),

  action_url text,                              -- e.g. /dashboard/appointments
  action_type text
    check (action_type is null or action_type in ('navigate', 'open_chat', 'open_review')),

  metadata jsonb not null default '{}',

  read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

-- Bell/list query: this business's rows by status, newest first.
create index if not exists notifications_business_status_idx
  on notifications (business_id, status, created_at desc);
-- Fast unread badge count.
create index if not exists notifications_unread_idx
  on notifications (business_id) where status = 'unread';
-- Source lookups (e.g. "does a reminder already exist for this appointment?").
create index if not exists notifications_source_idx
  on notifications (source_type, source_id);
-- Idempotency: at most one row per (source, type). Partial (source_id not null)
-- so multiple system_announcements with a null source stay allowed. This is
-- what makes the reminder cron safe to run repeatedly.
create unique index if not exists notifications_source_type_uniq
  on notifications (source_id, type) where source_id is not null;

-- 1.2 NOTIFICATION_SETTINGS (one row per business)
create table if not exists notification_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references businesses(id) on delete cascade,

  -- Per-type in-app/sound/badge switches. Missing keys fall back to enabled in
  -- application code, so new types don't require a data migration.
  type_settings jsonb not null default '{
    "new_booking":             {"in_app": true, "sound": true,  "badge": true},
    "reminder_1h":             {"in_app": true, "sound": false, "badge": true},
    "reminder_30m":            {"in_app": true, "sound": true,  "badge": true},
    "reminder_15m":            {"in_app": true, "sound": true,  "badge": true},
    "new_chat_message":        {"in_app": true, "sound": false, "badge": true},
    "appointment_cancelled":   {"in_app": true, "sound": true,  "badge": true},
    "appointment_rescheduled": {"in_app": true, "sound": false, "badge": true},
    "appointment_completed":   {"in_app": true, "sound": false, "badge": true},
    "no_show":                 {"in_app": true, "sound": true,  "badge": true},
    "new_review":              {"in_app": true, "sound": false, "badge": true}
  }'::jsonb,

  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time not null default '23:00',
  quiet_hours_end   time not null default '07:00',
  max_visible int not null default 10,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table notifications          enable row level security;
alter table notification_settings  enable row level security;

-- NOTIFICATIONS — merchant sees/updates only their own businesses' rows.
-- INSERTs come from service_role (cron + server-side createNotification), which
-- bypasses RLS, so no authenticated INSERT policy is needed.
drop policy if exists "owner reads own notifications" on notifications;
create policy "owner reads own notifications"
  on notifications for select
  to authenticated
  using (business_id in (select id from businesses where user_id = auth.uid()));

-- Merchant may flip status (read / archived) on their own rows. Column-level
-- grant below limits which columns can actually change.
drop policy if exists "owner updates own notifications" on notifications;
create policy "owner updates own notifications"
  on notifications for update
  to authenticated
  using (business_id in (select id from businesses where user_id = auth.uid()))
  with check (business_id in (select id from businesses where user_id = auth.uid()));

-- NOTIFICATION_SETTINGS — merchant manages their own business's row.
drop policy if exists "owner manages notification settings" on notification_settings;
create policy "owner manages notification settings"
  on notification_settings for all
  to authenticated
  using (business_id in (select id from businesses where user_id = auth.uid()))
  with check (business_id in (select id from businesses where user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 3. GRANTS — SQL-Editor-created tables are NOT auto-granted (see 0003 / 0012);
--    missing grants surface as 42501 even with permissive RLS. authenticated
--    UPDATE on notifications is column-scoped to the status transition columns
--    so message content stays immutable. service_role carries all writes.
-- ----------------------------------------------------------------------------
grant select on public.notifications to authenticated;
grant update (status, read_at, archived_at) on public.notifications to authenticated;
grant select, insert, update, delete on public.notifications to service_role;

grant select, insert, update on public.notification_settings to authenticated;
grant select, insert, update, delete on public.notification_settings to service_role;

-- ----------------------------------------------------------------------------
-- 4. REALTIME — postgres_changes needs the table in the supabase_realtime
--    publication. Merchant subscriptions are authorized against the RLS above;
--    an anon subscriber (no policy) receives nothing. Guarded for re-runs.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;

-- ============================================================================
-- End of migration 0013.
-- ============================================================================
