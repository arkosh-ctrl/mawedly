-- Mawedly migration 0003: table privileges for Supabase roles.
-- Tables created via the SQL Editor are NOT auto-granted to the anon /
-- authenticated roles, so even with permissive RLS they return
-- 42501 "permission denied for table". RLS still governs which ROWS each role
-- may touch; these GRANTs govern table-level access.

grant select, insert, update, delete on
  public.businesses,
  public.providers,
  public.services,
  public.customers,
  public.appointments
to authenticated;

-- Owners only read the audit log.
grant select on public.audit_log to authenticated;

-- Public booking page reads active businesses/providers/services
-- (the public-read RLS policies still limit rows to is_active = true).
grant select on
  public.businesses,
  public.providers,
  public.services
to anon;
