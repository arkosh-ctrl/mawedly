-- Mawedly migration 0006: per-business working hours (Week 2, minimal).
--
-- Two columns only. The availability algorithm reads the daily window from
-- HERE (not a hardcoded constant), so richer scheduling (per-day hours, breaks,
-- holidays) can be added later without rewriting the algorithm.

alter table businesses
  add column if not exists work_start time not null default '09:00';
alter table businesses
  add column if not exists work_end time not null default '21:00';
