-- ============================================================================
-- Phase 5l — let the Activity screen read the audit trail (pre-pilot C-#17).
-- ----------------------------------------------------------------------------
-- audit_log had RLS read policies (is_manager() + the shop fence) but no
-- table-level GRANT, so PostgREST returned 42501 before RLS even ran. The
-- grant only opens the door — RLS still decides who sees rows:
--   audit_select (is_manager()) AND audit_log_tenant (shop_id = current_shop()).
-- ============================================================================
grant select on public.audit_log to authenticated;
