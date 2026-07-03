-- ============================================================================
-- Mawedly migration 0012: live chat between merchant and customer (Phase 1).
--
-- One thread per appointment, stored in chat_messages. Architecture (final):
-- Supabase Realtime (postgres_changes) for the MERCHANT side only; the customer
-- side polls through server actions (option B) — so there are NO anon policies
-- on this table at all. Customer reads/writes go exclusively through
-- service_role server actions after the server has verified possession of the
-- appointment id (capability URL, same access model as the review system).
--
-- Chat is open only while the appointment is in ('pending_verification',
-- 'confirmed') — enforced by the SECURITY DEFINER trigger below. Terminal
-- states (completed / canceled / no_show) close the thread for writing, but the
-- merchant keeps read access to the archive (the SELECT policy carries no
-- status condition).
--
-- NOTE: ownership checks use businesses.user_id (the actual column from
-- migration 0001) — not "owner_id", which does not exist in this schema.
--
-- Re-runnable: guarded with IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS,
-- matching the style of the existing migrations.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE
-- ----------------------------------------------------------------------------
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments(id) on delete cascade not null,
  -- Derived by the BEFORE-INSERT trigger from the real appointment; any value
  -- supplied by a client is OVERWRITTEN and never trusted.
  business_id uuid references businesses(id) on delete cascade not null,
  -- Who sent it. No FK on sender_id: it is polymorphic — auth.uid() for
  -- 'business', customers.id for 'customer', NULL for 'system'.
  sender_type text not null
    check (sender_type in ('business', 'customer', 'system')),
  sender_id uuid,
  type text not null default 'text'
    check (type in ('text', 'image', 'file', 'system_message')),
  content text,
  -- Attachment metadata. file_path is a PATH inside the private
  -- chat-attachments bucket (signed URLs are minted at read time) — never a
  -- public URL. Mirrors how deposit_screenshot_path works.
  file_path text,
  file_name text,
  file_size int,
  mime_type text,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  -- A message must carry text, an attachment, or both — never neither.
  check (content is not null or file_path is not null)
);

-- Thread view: one appointment's messages in time order (DESC serves the
-- newest-first pagination in fetchChatHistory).
create index if not exists chat_messages_appointment_created_idx
  on chat_messages (appointment_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 2. SECURITY DEFINER trigger: derive business_id from the real appointment so
--    the sender never supplies it, and gate writing on the appointment being in
--    an open-chat status. Runs as the function owner (bypasses RLS) because the
--    inserting role has no SELECT on appointments (service_role path) or only
--    owner-scoped SELECT. search_path is pinned and EXECUTE is revoked from
--    PUBLIC (same hardening as migration 0009; trigger functions are not
--    directly callable, and EXECUTE is checked at trigger creation — not at
--    fire time — so revoking breaks nothing).
-- ----------------------------------------------------------------------------
create or replace function public.chat_messages_set_business_id()
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
  -- One generic, order-independent rejection: unknown appointment and closed
  -- chat look identical to the caller (no information leak).
  if appt is null
     or appt.status not in ('pending_verification', 'confirmed') then
    raise exception 'chat not allowed for this appointment';
  end if;
  NEW.business_id := appt.business_id;
  return NEW;
end;
$$;

revoke all on function public.chat_messages_set_business_id() from public;

drop trigger if exists trigger_chat_messages_set_business_id on chat_messages;
create trigger trigger_chat_messages_set_business_id
  before insert on chat_messages
  for each row execute function public.chat_messages_set_business_id();

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
--    NO anon policies whatsoever (option B): the customer never touches this
--    table directly — reads and writes both go through service_role server
--    actions after the server verifies appointment possession.
-- ----------------------------------------------------------------------------
alter table chat_messages enable row level security;

-- Merchant reads their own businesses' threads. No status condition: terminal
-- appointments remain a readable archive.
drop policy if exists "owner reads own chat messages" on chat_messages;
create policy "owner reads own chat messages"
  on chat_messages for select
  to authenticated
  using (
    business_id in (select id from businesses where user_id = auth.uid())
  );

-- Merchant writes only as 'business' and only into their own businesses'
-- threads. The open-status gate is the trigger's job, so archived threads are
-- closed for the merchant too.
drop policy if exists "owner sends chat messages" on chat_messages;
create policy "owner sends chat messages"
  on chat_messages for insert
  to authenticated
  with check (
    sender_type = 'business'
    and business_id in (select id from businesses where user_id = auth.uid())
  );

-- Merchant updates rows in their own threads. WITH CHECK defaults to USING.
-- Which COLUMNS may change is not RLS's job — the column-level grant below
-- restricts authenticated updates to (is_read, read_at) only, so message
-- content is immutable after insert.
drop policy if exists "owner updates chat read receipts" on chat_messages;
create policy "owner updates chat read receipts"
  on chat_messages for update
  to authenticated
  using (
    business_id in (select id from businesses where user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 4. GRANTS — SQL-Editor-created tables are NOT auto-granted (see migrations
--    0003 / 0007 / 0009: missing grants surface as 42501 even with permissive
--    RLS). authenticated UPDATE is column-scoped: read receipts only.
--    service_role carries the customer path (RLS-bypassing, server-side only).
-- ----------------------------------------------------------------------------
grant select, insert on public.chat_messages to authenticated;
grant update (is_read, read_at) on public.chat_messages to authenticated;
grant select, insert, update on public.chat_messages to service_role;

-- ----------------------------------------------------------------------------
-- 5. REALTIME — postgres_changes needs the table in the supabase_realtime
--    publication. Merchant subscriptions are authorized against the RLS above;
--    with no anon policies, an anon subscriber receives nothing. Guarded so the
--    migration stays re-runnable (ALTER PUBLICATION ... ADD errors on repeat).
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table chat_messages;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 6. STORAGE — private chat-attachments bucket. Object paths follow
--    {business_id}/{appointment_id}/{filename} so the first folder segment
--    drives the owner-only policy (same convention as bank-qrs / deposits in
--    migration 0001). Customers never upload directly: every upload goes
--    through a service_role server action (which bypasses storage RLS), and
--    customer downloads use short-lived signed URLs minted server-side.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;

drop policy if exists "owner manages chat attachments" on storage.objects;
create policy "owner manages chat attachments"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] in (
      select id::text from public.businesses where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] in (
      select id::text from public.businesses where user_id = auth.uid()
    )
  );

-- ============================================================================
-- End of migration 0012.
-- ============================================================================
