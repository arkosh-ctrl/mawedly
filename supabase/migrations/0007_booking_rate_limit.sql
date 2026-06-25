-- Mawedly migration 0007: public booking support.
--
-- 1) Rate-limit log for the public booking endpoint. Server-only: RLS is enabled
--    with NO policies, so anon/authenticated cannot touch it; the booking route
--    uses the service_role client (which bypasses RLS).
-- 2) Explicit service_role grants for the tables the booking flow touches, so a
--    SQL-Editor-created schema doesn't surprise us with 42501.

create table if not exists booking_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text,
  slug text,
  created_at timestamptz default now()
);
create index if not exists booking_attempts_ip_created_idx
  on booking_attempts (ip, created_at);

alter table booking_attempts enable row level security;
-- (intentionally no policies)

grant all on public.booking_attempts to service_role;
grant select on public.businesses, public.services, public.providers to service_role;
grant select, insert, update on public.customers to service_role;
grant select, insert on public.appointments to service_role;
