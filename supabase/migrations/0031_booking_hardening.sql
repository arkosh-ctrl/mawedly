-- Mawedly migration 0031: public booking hardening.
--
-- 1) booking_attempts gains a keyed phone digest so /api/book can rate-limit a
--    second dimension, (slug, phone_hash), that survives a spoofed
--    x-forwarded-for. The value is an HMAC keyed with the service-role secret
--    (src/lib/booking/phone-hash.ts) — never a raw number, so the attempts log
--    stays free of PII (PDPL). A bare SHA-256 would not: the Gulf mobile number
--    space is small enough to brute-force in seconds.
-- 2) Indexes for that dimension and for the 24h prune that now runs inside
--    /api/cron/reminders. The (ip, created_at) index from 0007 still serves the
--    IP dimension and is left untouched.
-- 3) A fixed upper bound on appointments.appointment_date, as the belt behind
--    the API's 365-day horizon.
--
-- Idempotent: safe to re-run.

alter table public.booking_attempts
  add column if not exists phone_hash text;

create index if not exists booking_attempts_slug_phone_created_idx
  on public.booking_attempts (slug, phone_hash, created_at);

create index if not exists booking_attempts_created_at_idx
  on public.booking_attempts (created_at);

-- A CHECK constraint cannot call now(), so the bound is a constant placed far
-- enough out that it can never reject a legitimate booking — it exists only to
-- stop "9999-12-31" calendar spam if the API guard is ever bypassed.
--
-- If rows already violate it, this ABORTS and reports how many. Nothing is
-- deleted or rewritten: report the count and decide before re-running.
do $$
declare
  offending bigint;
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_date_upper_bound'
      and conrelid = 'public.appointments'::regclass
  ) then
    select count(*) into offending
    from public.appointments
    where appointment_date >= date '2100-01-01';

    if offending > 0 then
      raise exception
        'aborting 0031: % appointments row(s) have appointment_date >= 2100-01-01 — report this count, do not delete',
        offending;
    end if;

    alter table public.appointments
      add constraint appointments_date_upper_bound
      check (appointment_date < date '2100-01-01');
  end if;
end $$;

-- Re-assert the grant (idempotent) — the booking route reads and writes this
-- table with the service_role client, and the cron prune now deletes from it.
grant all on public.booking_attempts to service_role;
