-- ============================================================================
-- Phase 5 · 5b — PAYMENT-PATH tenant guard (service_role-safe money path)
-- ----------------------------------------------------------------------------
-- The payment edge functions run as the SERVICE ROLE, which BYPASSES RLS. So the
-- restrictive tenant fence added in 5a does NOT protect payment_transactions /
-- payment_events when written by those functions. This file adds DB-level guards
-- that hold even under service_role, so a payment can never be mis-tenanted:
--
--   1) payment_transactions.shop_id is DERIVED from its receipt (invoice_id) on
--      every insert/update — it is NEVER trusted from the caller. A charge for a
--      receipt always belongs to that receipt's shop, full stop.
--   2) payment_events.shop_id is DERIVED from the matching transaction's shop, so
--      the Stripe webhook (which has no caller/shop) still writes tenant-correct
--      rows without any code change.
--
-- The edge functions ALSO scope every receipt/transaction lookup by the caller's
-- shop (resolved from shop_members, the security authority) — defense in depth.
-- See SECURITY_AUDIT_PHASE4.md / 5a step 8. Idempotent. Run after all phase5 SQL.
-- Depends on: phase4 (subscriptions), phase5/5a (shops, current_shop()),
--             receipts/payment_transactions/payment_events (payments_setup).
-- ============================================================================

-- 1) Backfill: align every existing payment row to its receipt's / txn's shop. -
update public.payment_transactions t
   set shop_id = r.shop_id
  from public.receipts r
 where r.id = t.invoice_id
   and t.shop_id is distinct from r.shop_id;

update public.payment_events e
   set shop_id = t.shop_id
  from public.payment_transactions t
 where t.stripe_payment_intent_id = e.payment_intent_id
   and e.shop_id is distinct from t.shop_id;

-- 2) A transaction's shop is ALWAYS its receipt's shop (forge-proof). ---------
create or replace function public.payment_txn_stamp_shop()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_shop uuid;
begin
  select shop_id into v_shop from public.receipts where id = NEW.invoice_id;
  if v_shop is not null then
    NEW.shop_id := v_shop;          -- derived from the receipt, not the caller
  end if;
  return NEW;
end $$;
drop trigger if exists trg_payment_txn_shop on public.payment_transactions;
create trigger trg_payment_txn_shop
  before insert or update on public.payment_transactions
  for each row execute function public.payment_txn_stamp_shop();

-- 3) An event's shop is the matching transaction's shop (webhook stays scoped).
create or replace function public.payment_event_stamp_shop()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_shop uuid;
begin
  if NEW.shop_id is null and NEW.payment_intent_id is not null then
    select shop_id into v_shop from public.payment_transactions
      where stripe_payment_intent_id = NEW.payment_intent_id limit 1;
    NEW.shop_id := v_shop;
  end if;
  return NEW;
end $$;
drop trigger if exists trg_payment_event_shop on public.payment_events;
create trigger trg_payment_event_shop
  before insert on public.payment_events
  for each row execute function public.payment_event_stamp_shop();
