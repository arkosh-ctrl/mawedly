-- ============================================================================
-- Mawedly — Schema V3.2 (full setup)
-- Run this once in the Supabase SQL Editor on a fresh project.
-- Order: extension -> tables -> function/trigger -> RLS -> policies -> storage.
-- Re-runnable: guarded with IF NOT EXISTS / DROP ... IF EXISTS.
-- Source of truth: docs/mawedly-master-spec-final.md (sections 3, 4, 5).
-- ============================================================================

-- gen_random_uuid() lives in pgcrypto (enabled by default on Supabase; kept here
-- defensively so the script is portable).
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. TABLES (created in dependency order)
-- ----------------------------------------------------------------------------

-- 1.1 BUSINESSES
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  slug text unique not null,
  type text not null default 'salon',          -- salon | consulting | other
  phone text not null,                          -- WhatsApp number (wa.me links)
  notification_email text,                      -- merchant notifications (may differ from login email)
  default_language text default 'ar',           -- ar | en
  bank_name text,
  bank_iban text,
  bank_account_name text,
  bank_qr_path text,                            -- path in a private bucket (no public URL)
  is_active boolean default true,
  plan text not null default 'free',            -- free | starter | growth | pro
  trial_ends_at timestamptz default now() + interval '14 days',
  created_at timestamptz default now()
);
create index if not exists businesses_user_id_idx on businesses (user_id);
create index if not exists businesses_slug_idx on businesses (slug);

-- 1.2 PROVIDERS
create table if not exists providers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  name text not null,
  title text,
  is_active boolean default true,
  created_at timestamptz default now()
);
create index if not exists providers_business_id_idx on providers (business_id);

-- 1.3 SERVICES
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  name text not null,
  duration_minutes int not null default 30,
  price numeric(10,2) not null,
  deposit_amount numeric(10,2) not null default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);
create index if not exists services_business_id_idx on services (business_id);

-- 1.4 CUSTOMERS
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  name text not null,
  phone text not null,                          -- 9665xxxxxxxx
  email text,                                   -- optional (for email receipts)
  notes text,
  created_at timestamptz default now(),
  unique (business_id, phone)
);
create index if not exists customers_business_id_idx on customers (business_id);

-- 1.5 APPOINTMENTS (state machine)
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  provider_id uuid references providers(id) not null,
  service_id uuid references services(id) not null,
  customer_id uuid references customers(id) not null,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,                       -- computed automatically (trigger)
  status text not null default 'pending_verification',
    -- pending_verification | confirmed | canceled | no_show | completed
  deposit_screenshot_path text,                 -- private Storage path
  deposit_verified boolean default false,
  customer_notes text,
  created_at timestamptz default now()
);
create index if not exists appointments_business_date_idx on appointments (business_id, appointment_date);
create index if not exists appointments_provider_date_idx on appointments (provider_id, appointment_date);

-- 1.6 AUDIT_LOG (dispute resolution for intentional manual edits)
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  appointment_id uuid references appointments(id) on delete set null,
  action text not null,
  actor text,                                   -- merchant | customer | system
  meta jsonb,
  created_at timestamptz default now()
);
create index if not exists audit_log_business_created_idx on audit_log (business_id, created_at);

-- ----------------------------------------------------------------------------
-- 2. FUNCTION + TRIGGER: auto-compute appointment end_time
-- ----------------------------------------------------------------------------
create or replace function calculate_end_time()
returns trigger as $$
declare
  service_duration int;
begin
  select duration_minutes into service_duration from services where id = NEW.service_id;
  NEW.end_time := NEW.start_time + (service_duration || ' minutes')::interval;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trigger_calculate_end_time on appointments;
create trigger trigger_calculate_end_time
  before insert or update on appointments
  for each row execute function calculate_end_time();

-- ----------------------------------------------------------------------------
-- 3. ENABLE ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table businesses   enable row level security;
alter table providers    enable row level security;
alter table services     enable row level security;
alter table customers    enable row level security;
alter table appointments enable row level security;
alter table audit_log    enable row level security;

-- ----------------------------------------------------------------------------
-- 4. RLS POLICIES (ownership via auth.uid() = user_id; public reads active rows)
-- ----------------------------------------------------------------------------

-- BUSINESSES
drop policy if exists "owner manages own business" on businesses;
create policy "owner manages own business"
  on businesses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "public can read active businesses" on businesses;
create policy "public can read active businesses"
  on businesses for select using (is_active = true);

-- PROVIDERS
drop policy if exists "owner manages providers" on providers;
create policy "owner manages providers"
  on providers for all
  using (business_id in (select id from businesses where user_id = auth.uid()))
  with check (business_id in (select id from businesses where user_id = auth.uid()));

drop policy if exists "public reads active providers" on providers;
create policy "public reads active providers"
  on providers for select using (is_active = true);

-- SERVICES
drop policy if exists "owner manages services" on services;
create policy "owner manages services"
  on services for all
  using (business_id in (select id from businesses where user_id = auth.uid()))
  with check (business_id in (select id from businesses where user_id = auth.uid()));

drop policy if exists "public reads active services" on services;
create policy "public reads active services"
  on services for select using (is_active = true);

-- CUSTOMERS (no public read)
drop policy if exists "owner manages customers" on customers;
create policy "owner manages customers"
  on customers for all
  using (business_id in (select id from businesses where user_id = auth.uid()))
  with check (business_id in (select id from businesses where user_id = auth.uid()));

-- APPOINTMENTS (no public read; public inserts go through a server route, not the client)
drop policy if exists "owner manages appointments" on appointments;
create policy "owner manages appointments"
  on appointments for all
  using (business_id in (select id from businesses where user_id = auth.uid()))
  with check (business_id in (select id from businesses where user_id = auth.uid()));

-- AUDIT_LOG (owner read only)
drop policy if exists "owner reads own audit" on audit_log;
create policy "owner reads own audit"
  on audit_log for select
  using (business_id in (select id from businesses where user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 5. STORAGE (private buckets + owner-only object policies)
--    Convention: object paths start with "{business_id}/..." so ownership can
--    be derived from the first folder segment. Access is via signed URLs only
--    (generated server-side) — the buckets are private (no public policy).
-- ----------------------------------------------------------------------------

-- Create private buckets (idempotent).
insert into storage.buckets (id, name, public)
values ('bank-qrs', 'bank-qrs', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('deposits', 'deposits', false)
on conflict (id) do nothing;

-- Owner can read/write/delete objects only under their own business folder.
drop policy if exists "owner manages bank-qrs and deposits" on storage.objects;
create policy "owner manages bank-qrs and deposits"
  on storage.objects for all
  to authenticated
  using (
    bucket_id in ('bank-qrs', 'deposits')
    and (storage.foldername(name))[1] in (
      select id::text from public.businesses where user_id = auth.uid()
    )
  )
  with check (
    bucket_id in ('bank-qrs', 'deposits')
    and (storage.foldername(name))[1] in (
      select id::text from public.businesses where user_id = auth.uid()
    )
  );

-- ============================================================================
-- End of setup.
-- ============================================================================
