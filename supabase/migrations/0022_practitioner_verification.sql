-- ============================================================================
-- Practitioner Verification System
-- Regulated professions (mental health, nutrition, medical, general health,
-- legal, accounting, engineering) can submit a professional license for manual
-- review. Non-regulated professions default to 'not_required'.
--
-- The source of truth for WHICH profession types require a license lives in
-- application code (src/lib/verification/professions.ts) — the same pattern as
-- businesses.type, which is free text with no DB enum. These columns store the
-- captured license data + review lifecycle only.
--
-- Table-level grants already cover new columns (grants are per-table), so no
-- extra GRANT is needed for authenticated/service_role.
-- ============================================================================

alter table public.businesses
  add column if not exists requires_license boolean not null default false,
  add column if not exists license_number text,
  add column if not exists license_issuer text,
  -- Path inside the private `licenses` bucket (never a public URL) — served via
  -- short-lived signed URLs only, mirroring bank_qr_path.
  add column if not exists license_document_path text,
  add column if not exists verification_status text not null default 'not_required',
  add column if not exists license_verified_at timestamptz;

-- Constrain the lifecycle to the four known states. Guarded so re-running is safe.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'businesses_verification_status_check'
  ) then
    alter table public.businesses
      add constraint businesses_verification_status_check
      check (verification_status in ('not_required', 'pending', 'verified', 'rejected'));
  end if;
end $$;

-- Private bucket for uploaded license documents (idempotent).
insert into storage.buckets (id, name, public)
values ('licenses', 'licenses', false)
on conflict (id) do nothing;

-- Owner can read/write/delete license objects only under their own business
-- folder — identical shape to the bank-qrs/deposits policy in 0001.
drop policy if exists "owner manages licenses" on storage.objects;
create policy "owner manages licenses"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'licenses'
    and (storage.foldername(name))[1] in (
      select id::text from public.businesses where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'licenses'
    and (storage.foldername(name))[1] in (
      select id::text from public.businesses where user_id = auth.uid()
    )
  );
