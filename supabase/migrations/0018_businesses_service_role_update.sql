-- ============================================================================
-- Mawedly migration 0018: allow service_role to UPDATE businesses.
--
-- migration 0003 granted businesses to authenticated/anon but not an explicit
-- UPDATE to service_role, so the admin console's activate/suspend action failed
-- (42501) when the service-role client tried to flip businesses.is_active.
-- SELECT already worked (hence read pages were fine); this adds UPDATE.
-- Idempotent.
-- ============================================================================

grant update on public.businesses to service_role;

-- ============================================================================
-- End of migration 0018.
-- ============================================================================
