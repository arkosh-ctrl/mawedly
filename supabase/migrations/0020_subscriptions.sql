-- 0020: Subscriptions (4 plans + Lemon Squeezy billing state).
-- Plans are DEFINED IN CODE (src/lib/billing/plans.ts) — the DB only stores
-- each business's subscription STATE. The existing `plan` column (0001,
-- legacy values free|starter|growth|pro) is repurposed as the plan id:
-- free | pro_49 | center_99 | enterprise_299.
--
-- Usage counting is LAZY-RESET: no monthly cron. usage_reset_at holds the
-- first day of the month the counter belongs to; any read/write path that
-- sees a stale month zeroes the counter first (src/lib/billing/usage.ts).

-- Normalise legacy plan values, then constrain.
update public.businesses
  set plan = 'free'
  where plan not in ('free', 'pro_49', 'center_99', 'enterprise_299');

alter table public.businesses
  add constraint businesses_plan_check
    check (plan in ('free', 'pro_49', 'center_99', 'enterprise_299'));

alter table public.businesses
  add column monthly_appointments_count integer not null default 0,
  add column usage_reset_at date not null default date_trunc('month', now())::date,
  add column lemon_subscription_id text,
  add column lemon_customer_id text,
  add column subscription_status text not null default 'none'
    check (subscription_status in ('none', 'active', 'past_due', 'cancelled', 'expired')),
  add column subscription_renews_at timestamptz,
  -- Enterprise branding (logo lives in the private brand-assets bucket).
  add column brand_logo_path text,
  add column brand_color text check (brand_color ~ '^#[0-9a-fA-F]{6}$');

-- Webhook audit log + idempotency (lemon_event_id is unique: a redelivered
-- webhook is recorded once and skipped on replay).
create table public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  lemon_event_id text not null unique,
  event_name text not null,
  business_id uuid references public.businesses(id) on delete set null,
  payload jsonb not null,
  processed boolean not null default false,
  error text,
  created_at timestamptz not null default now()
);

create index idx_billing_webhook_events_business
  on public.billing_webhook_events (business_id);

alter table public.billing_webhook_events enable row level security;

-- Webhooks are written/read by the service_role only; platform admins can
-- audit through the existing admin console (service_role queries).
grant select, insert, update on public.billing_webhook_events to service_role;

-- Storage bucket for enterprise brand logos (private; served via signed URLs
-- or read server-side with service_role for the public booking page).
insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', false)
on conflict (id) do nothing;

create policy "owner manages own brand assets"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] in (
      select id::text from public.businesses where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] in (
      select id::text from public.businesses where user_id = auth.uid()
    )
  );
