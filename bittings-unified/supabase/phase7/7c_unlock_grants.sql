-- ============================================================================
-- Phase 7c — grants for the pin-unlock edge function (shift system).
-- ----------------------------------------------------------------------------
-- pin-unlock runs as service_role: it records every machine session-switch in
-- the audit trail (insert on audit_log) and checks whether the PIN's owner has
-- an open shift (select on time_entries — already granted in 7a).
-- ============================================================================
grant insert on public.audit_log to service_role;
