-- Mawedly migration 0005: prevent double-booking at the DB level (Week 2, brick 1).
--
-- Safety net independent of application code: even if the booking route has a
-- bug or two requests race, Postgres rejects an appointment whose time range
-- overlaps an existing one for the SAME provider.
--
-- btree_gist lets us combine equality (provider_id =) with range overlap (&&)
-- in one gist index. tsrange defaults to [) so back-to-back slots (one ending
-- at 10:00, next starting 10:00) do NOT overlap. The partial WHERE means only
-- blocking statuses reserve the slot — canceled / no_show free it.

create extension if not exists btree_gist;

alter table appointments
  add constraint appointments_no_overlap
  exclude using gist (
    provider_id with =,
    tsrange(appointment_date + start_time, appointment_date + end_time) with &&
  )
  where (status in ('pending_verification', 'confirmed', 'completed'));
