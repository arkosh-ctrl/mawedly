-- ============================================================================
-- Contacts (Calendly-style) — built ON the existing `customers` table.
-- Bookings already create a customers row (api/book), so customers IS the
-- contact store; we extend it rather than adding a parallel table. Contacts are
-- scoped to a business; RLS reuses the existing "owner manages customers"
-- policy (business ownership via auth.uid()).
-- ============================================================================

alter table public.customers
  add column if not exists job_title text,
  add column if not exists company text,
  add column if not exists linkedin_url text,
  add column if not exists timezone text,
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists custom_fields jsonb not null default '{}'::jsonb,
  add column if not exists source text not null default 'booking',
  add column if not exists is_favorite boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists updated_at timestamptz default now();

-- Manual contacts may have an email but no phone. Existing unique(business_id,
-- phone) still holds — Postgres treats NULL phones as distinct, so multiple
-- phone-less contacts are allowed.
alter table public.customers alter column phone drop not null;

create index if not exists customers_business_active_idx
  on public.customers (business_id) where deleted_at is null;
create index if not exists customers_favorite_idx
  on public.customers (business_id, is_favorite) where deleted_at is null;

-- Keep updated_at fresh on every update.
create or replace function public.set_customers_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_customers_updated_at();

-- ----------------------------------------------------------------------------
-- Sent-email log (merchant → contact, via Resend).
-- ----------------------------------------------------------------------------
create table if not exists public.sent_emails (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  to_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'sent',      -- sent | failed
  resend_message_id text,
  sent_at timestamptz default now()
);

alter table public.sent_emails enable row level security;

drop policy if exists "owner manages sent_emails" on public.sent_emails;
create policy "owner manages sent_emails"
  on public.sent_emails for all
  using (business_id in (select id from public.businesses where user_id = auth.uid()))
  with check (business_id in (select id from public.businesses where user_id = auth.uid()));

-- SQL-Editor tables need explicit grants (RLS still governs rows).
grant select, insert, update, delete on public.sent_emails to authenticated;

create index if not exists sent_emails_business_idx
  on public.sent_emails (business_id, sent_at desc);
create index if not exists sent_emails_customer_idx
  on public.sent_emails (customer_id);
