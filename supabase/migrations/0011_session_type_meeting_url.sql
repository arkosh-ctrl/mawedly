-- Consultation pivot, step 1: virtual-session foundation.
--
-- services.session_type: how a session is delivered. Free text like
-- businesses.type (no CHECK), documented set: in_person | virtual | phone.
-- Defaults to in_person so every existing service keeps today's behaviour.
--
-- businesses.meeting_url: the merchant's own permanent meeting room (Zoom
-- personal room, Google Meet, ...). Nullable; shared with the customer only
-- after the merchant confirms the deposit — never on the public page. When
-- the Zoom API integration lands, per-appointment links will supersede this.
--
-- Additive and backward-compatible: no data rewrite, no RLS change needed
-- (existing row-level policies on both tables already cover new columns).

alter table services
  add column if not exists session_type text not null default 'in_person';

alter table businesses
  add column if not exists meeting_url text;
