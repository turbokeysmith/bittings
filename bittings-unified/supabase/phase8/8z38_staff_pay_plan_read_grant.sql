-- 8z38 — let signed-in staff READ staff.pay_plan and staff.after_hours_pct.
--
-- Phase 1a gives `authenticated` column-level SELECT on staff (so pin_hash, phone and address stay hidden).
-- 8z22 added pay_plan + after_hours_pct and the Team logins card started selecting them, but the columns were
-- never added to that grant. PostgREST then refuses the whole query (42501 "permission denied for table staff"),
-- and Settings > Access & managers showed "No staff rows yet." instead of the team (found 2026-11-11: the owner
-- could not see Jayden). Rows are still limited to the caller's own shop by RLS (staff_select + staff_tenant).
-- Writes still go only through staff_set_pay_plan() (owner only, audit-logged).
--
-- Rollback: revoke select (pay_plan, after_hours_pct) on public.staff from authenticated;
grant select (pay_plan, after_hours_pct) on public.staff to authenticated;
notify pgrst, 'reload schema';
