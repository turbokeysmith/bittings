-- ============================================================================
-- Phase 5h — grants for the staff-invite edge function (pre-pilot review #5).
-- ----------------------------------------------------------------------------
-- The `staff-invite` edge function runs as service_role: it creates the auth
-- user (temp password, admin API) and inserts the staff row (which the
-- trg_staff_member trigger mirrors into shop_members). service_role only had
-- SELECT on staff (5c pattern) — give it the DML the function needs.
-- delete = rollback path only (if the staff insert fails after user creation).
-- ============================================================================
grant insert, update, delete on public.staff to service_role;
