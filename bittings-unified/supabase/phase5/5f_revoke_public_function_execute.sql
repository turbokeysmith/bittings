-- ============================================================================
-- Phase 5f — EXECUTE hygiene: close every anon-executable SECURITY DEFINER fn.
-- ----------------------------------------------------------------------------
-- Postgres grants EXECUTE to PUBLIC by default on every new function. Phases
-- 1/2/6 revoked it on their functions; the phase-4 tier fns, the phase-5 shop
-- fns, the 5b/6a trigger fns, and a few generic helpers missed the revoke —
-- these are exactly the ~15 "anon can execute" items on the Supabase security
-- linter (QA audit 2026-06-30 🔴 #3, re-confirmed live 2026-07-02).
--
-- Pattern already proven in THIS database: fn_audit / fn_guard_booking_status /
-- fn_sync_inv_total / rls_auto_enable / unit_ensure_serialized have EXECUTE
-- fully revoked and their triggers fire fine (EXECUTE is checked when a trigger
-- is created, not when it fires). The embedded-Postgres isolation test now also
-- proves the 5b payment stamps fire for authenticated sessions post-revoke.
--
-- Client call-sites verified before choosing grants (grep .rpc('…')):
--   create_shop + current_shop      → store.js   (keep authenticated)
--   shop_tier + seat_usage          → tier.js    (keep authenticated)
--   tier_allows / require_tier      → server-side only, but harmless + may gate
--                                     RPCs later (keep authenticated)
--   current_subscription            → NO caller anywhere; leaks stripe ids of
--                                     the most-recent GLOBAL subscription row
--                                     (not shop-scoped) → service_role only
--   inv_on_hand                     → NO client caller; internal SQL helper
--                                     (nested calls run as definer) → service_role only
--   strip_receipt_costs             → used INSIDE receipts_safe, a
--                                     security_invoker view → the SESSION user
--                                     needs EXECUTE (keep authenticated)
--   _sweep_1b                       → leftover phase-1b QA scaffolding, no
--                                     references in repo or app → DROP
-- ============================================================================

-- 1) Trigger-only functions — nothing ever calls these directly.
revoke execute on function public.payment_txn_stamp_shop()   from public, anon, authenticated;
revoke execute on function public.payment_event_stamp_shop() from public, anon, authenticated;
revoke execute on function public.fn_units_rollup()          from public, anon, authenticated;
revoke execute on function public.sync_staff_member()        from public, anon, authenticated;
revoke execute on function public.touch_updated_at()         from public, anon, authenticated;

-- 2) Client-called RPCs — drop PUBLIC/anon, keep authenticated.
revoke execute on function public.create_shop(text) from public, anon;
grant  execute on function public.create_shop(text) to authenticated;

-- current_shop() is referenced by the RESTRICTIVE tenant fence on ~25 tables:
-- every querying role needs EXECUTE.
revoke execute on function public.current_shop() from public, anon;
grant  execute on function public.current_shop() to authenticated, service_role;

revoke execute on function public.shop_tier() from public, anon;
grant  execute on function public.shop_tier() to authenticated, service_role;

revoke execute on function public.seat_usage() from public, anon;
grant  execute on function public.seat_usage() to authenticated, service_role;

revoke execute on function public.tier_allows(text) from public, anon;
grant  execute on function public.tier_allows(text) to authenticated, service_role;

revoke execute on function public.require_tier(text) from public, anon;
grant  execute on function public.require_tier(text) to authenticated, service_role;

-- 3) Server-internal helpers — no client call sites at all.
revoke execute on function public.current_subscription() from public, anon, authenticated;
grant  execute on function public.current_subscription() to service_role;

revoke execute on function public.inv_on_hand(text, text) from public, anon, authenticated;
grant  execute on function public.inv_on_hand(text, text) to service_role;

-- 4) receipts_safe is security_invoker → the session user executes this helper.
revoke execute on function public.strip_receipt_costs(jsonb) from public, anon;
grant  execute on function public.strip_receipt_costs(jsonb) to authenticated, service_role;

-- 5) Leftover QA scaffolding from the 1b sweep — not referenced anywhere.
drop function if exists public._sweep_1b();
