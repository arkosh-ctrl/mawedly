-- Mawedly migration 0008: customer deposit-receipt upload.
--
-- The deposit-receipt upload is performed by an ANONYMOUS customer via a
-- server route that uses the service_role client (the `deposits` storage bucket
-- is private and owner-only, so anon cannot write to it directly). That route
-- needs to set appointments.deposit_screenshot_path, but service_role was only
-- granted select+insert on appointments in 0007 — add update here.
--
-- No schema change: the column (deposit_screenshot_path), the private `deposits`
-- bucket, and the owner-only storage policy all already exist from 0001.

grant update on public.appointments to service_role;
