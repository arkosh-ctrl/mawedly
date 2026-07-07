-- ============================================================================
-- Mawedly migration 0015: calendar-integration tracking (optional analytics).
--
-- Two nullable columns record whether/when a customer added the appointment to
-- their calendar. Additive and backward-compatible — no data rewrite, no RLS
-- change (existing owner policies already cover new columns). The .ics download
-- route writes these via the service-role client, so an explicit grant is
-- included (SQL-Editor tables aren't auto-granted; see 0003 / 0012).
-- ============================================================================

alter table public.appointments
  add column if not exists calendar_added boolean default false,
  add column if not exists calendar_added_at timestamptz;

-- Partial index for "not yet added" analytics queries.
create index if not exists idx_appointments_calendar_pending
  on public.appointments (calendar_added)
  where calendar_added = false;

-- service_role already has broad grants from 0008; this is explicit/defensive
-- for the new columns on the update path used by /api/calendar/[id].
grant update (calendar_added, calendar_added_at)
  on public.appointments to service_role;

-- ============================================================================
-- End of migration 0015.
-- ============================================================================
