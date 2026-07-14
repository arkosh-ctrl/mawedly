-- ============================================================================
-- Contacts Phase 2 — custom lists (segments) + custom field definitions.
-- All business-scoped; RLS mirrors the "owner via business ownership" pattern.
-- SQL-Editor tables need explicit grants (RLS still governs rows).
-- ============================================================================

-- Lists (segments) a merchant creates: VIP, New clients, etc.
create table if not exists public.contact_lists (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  color text default '#3B82F6',
  created_at timestamptz default now()
);
alter table public.contact_lists enable row level security;
drop policy if exists "owner manages contact_lists" on public.contact_lists;
create policy "owner manages contact_lists"
  on public.contact_lists for all
  using (business_id in (select id from public.businesses where user_id = auth.uid()))
  with check (business_id in (select id from public.businesses where user_id = auth.uid()));
grant select, insert, update, delete on public.contact_lists to authenticated;
create index if not exists contact_lists_business_idx on public.contact_lists (business_id);

-- Many-to-many membership (contact ↔ list). A contact is a customers row.
create table if not exists public.contact_list_members (
  contact_id uuid not null references public.customers(id) on delete cascade,
  list_id uuid not null references public.contact_lists(id) on delete cascade,
  added_at timestamptz default now(),
  primary key (contact_id, list_id)
);
alter table public.contact_list_members enable row level security;
-- Membership belongs to whoever owns the LIST (which is business-scoped).
drop policy if exists "owner manages list members" on public.contact_list_members;
create policy "owner manages list members"
  on public.contact_list_members for all
  using (
    list_id in (
      select cl.id from public.contact_lists cl
      join public.businesses b on b.id = cl.business_id
      where b.user_id = auth.uid()
    )
  )
  with check (
    list_id in (
      select cl.id from public.contact_lists cl
      join public.businesses b on b.id = cl.business_id
      where b.user_id = auth.uid()
    )
  );
grant select, insert, update, delete on public.contact_list_members to authenticated;
create index if not exists contact_list_members_list_idx on public.contact_list_members (list_id);
create index if not exists contact_list_members_contact_idx on public.contact_list_members (contact_id);

-- Custom field definitions per business. Values live in customers.custom_fields
-- (jsonb, already added in 0024), keyed by `key`.
create table if not exists public.custom_field_definitions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,               -- display label, e.g. "الميزانية"
  key text not null,                -- jsonb key, e.g. "budget"
  type text not null default 'text',-- text | number | date
  created_at timestamptz default now(),
  unique (business_id, key)
);
alter table public.custom_field_definitions enable row level security;
drop policy if exists "owner manages field definitions" on public.custom_field_definitions;
create policy "owner manages field definitions"
  on public.custom_field_definitions for all
  using (business_id in (select id from public.businesses where user_id = auth.uid()))
  with check (business_id in (select id from public.businesses where user_id = auth.uid()));
grant select, insert, update, delete on public.custom_field_definitions to authenticated;
create index if not exists custom_field_definitions_business_idx
  on public.custom_field_definitions (business_id);
