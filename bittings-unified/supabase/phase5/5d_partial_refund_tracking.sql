-- ============================================================================
-- Phase 5 · 5d — partial-refund tracking (refunded_cents + partially_refunded)
-- ----------------------------------------------------------------------------
-- BUG (found in the 2026-07-01 live payment QA): pay-refund set status='refunded'
-- for ANY refund and there was no per-transaction refunded total, so a PARTIAL
-- refund read as a FULL refund in Transaction History / Closeout and net-collected
-- was wrong (the whole sale vanished from "collected"). Stripe itself refunded the
-- correct amount — this was a DB/reporting defect only.
--
-- FIX (three parts; this file is the DB half):
--   • add `refunded_cents` (running total actually refunded on the transaction);
--   • pay-refund accumulates it and only marks status='refunded' when
--     refunded_cents >= captured_cents, else 'partially_refunded' (status is a
--     plain text column — no CHECK constraint to widen); it also now allows a
--     second refund against a 'partially_refunded' row up to the captured amount;
--   • pay-void (cash/check) stamps refunded_cents = captured_cents (full void).
--   The app's Closeout + Transaction History net math reads captured − refunded.
--
-- Applied live via mcp apply_migration (phase5_5d_partial_refund_tracking),
-- 2026-07-01. Idempotent. Depends on: payments_setup.sql, phase5/5a.
-- ============================================================================

alter table public.payment_transactions
  add column if not exists refunded_cents integer not null default 0;

-- Backfill existing fully-refunded rows so historical net-collected is correct.
update public.payment_transactions
   set refunded_cents = coalesce(captured_cents, base_cents, 0)
 where status = 'refunded' and refunded_cents = 0;
