-- ============================================================================
-- Phase 4 · 4a — Subscription TIERS + feature gating (server-enforced)
-- ----------------------------------------------------------------------------
-- Mirrors the existing role pattern (is_staff/is_manager/is_owner, SECURITY
-- DEFINER, self-enforcing). Adds a per-shop subscription + a tier→feature matrix
-- so the SERVER decides what a shop can use; the UI only mirrors it.
--
-- Tiers:  lookup  <  starter  <  pro
--   lookup  — reference tools only (VIN/Lishi/programmer lookup, keycodes).
--   starter — lookup + POS/register, receipts, customers, inventory, scheduler.
--   pro     — everything (commission, fleet dispatch, reports, NASTF/D1, …).
-- Add-ons: extra user "seats" beyond the tier's included count (a counter).
--
-- ⚠️ SINGLE-TENANT NOTE: today there is ONE shop (one shop_config row). shop_id
-- is carried for the future multi-tenant split but is NOT yet an isolation
-- boundary (see SECURITY_AUDIT_PHASE4.md). This file gates FEATURES, not tenant
-- data isolation — those are independent. Apply in the Supabase SQL editor.
-- Depends on: phase1/1a (is_staff/is_manager/is_owner), shop_config.
-- ============================================================================

-- 1) Subscription state (one row per shop; single row today). ---------------
create table if not exists public.subscriptions (
  shop_id                uuid primary key default gen_random_uuid(),
  tier                   text not null default 'lookup'
                           check (tier in ('lookup','starter','pro')),
  status                 text not null default 'active'
                           check (status in ('active','trialing','past_due','canceled','incomplete')),
  seats_included         int  not null default 1,        -- users included in the tier
  seats_addon            int  not null default 0,        -- extra purchased seats (add-on count)
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
-- seed the single existing shop if empty
insert into public.subscriptions (tier, status, seats_included)
  select 'pro','active',5
  where not exists (select 1 from public.subscriptions);

-- 2) The current shop's subscription row (single-tenant: the only row). ------
--    SECURITY DEFINER so it reads past RLS, like is_staff().
create or replace function public.current_subscription()
returns public.subscriptions language sql stable security definer set search_path=public as $$
  select * from public.subscriptions order by updated_at desc limit 1;
$$;

create or replace function public.shop_tier()
returns text language sql stable security definer set search_path=public as $$
  select coalesce((select tier from public.subscriptions
                   where status in ('active','trialing')
                   order by updated_at desc limit 1), 'lookup');
$$;

-- 3) Tier → feature matrix (the source of truth; owner can edit the CASE). ---
--    Returns true if the shop's current tier unlocks `feature`.
create or replace function public.tier_allows(feature text)
returns boolean language sql stable security definer set search_path=public as $$
  with t as (select public.shop_tier() as tier)
  select case
    -- reference tools: every tier (even lookup)
    when feature in ('lookup','keycodes','programmers','lishi') then true
    -- operational features: starter and up
    when feature in ('pos','receipts','customers','inventory','scheduler')
      then (select tier in ('starter','pro') from t)
    -- premium features: pro only
    when feature in ('commission','fleet','reports','dashboard','nastf','closeout','move_requests')
      then (select tier = 'pro' from t)
    else false
  end;
$$;

-- 4) Hard guard for RPCs that should be tier-gated server-side. --------------
--    Call `perform public.require_tier('pos')` at the top of a gated action.
create or replace function public.require_tier(feature text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.tier_allows(feature) then
    raise exception 'TIER_LOCKED: % requires a higher plan (current: %)', feature, public.shop_tier()
      using errcode='42501';
  end if;
end;
$$;

-- 5) Seat usage vs entitlement (for the add-on counter). --------------------
create or replace function public.seat_usage()
returns table(used int, allowed int) language sql stable security definer set search_path=public as $$
  select (select count(*)::int from public.staff where active),
         (select (seats_included + seats_addon) from public.subscriptions
          order by updated_at desc limit 1);
$$;

-- 6) Read access: any signed-in staff may READ the subscription/tier (to mirror
--    locks in the UI). Only the service_role (Stripe webhook) WRITES it — no
--    client-side tier escalation. Managers can read seat usage.
grant select (tier,status,seats_included,seats_addon,current_period_end,updated_at,shop_id)
  on public.subscriptions to authenticated;
revoke insert, update, delete on public.subscriptions from authenticated;
grant select, insert, update on public.subscriptions to service_role;  -- Stripe webhook only

create policy sub_select on public.subscriptions for select to authenticated using (public.is_staff());

-- expose the helpers
grant execute on function public.current_subscription(), public.shop_tier(),
  public.tier_allows(text), public.require_tier(text), public.seat_usage() to authenticated;

-- ============================================================================
-- Owner action when a tier should gate an existing RPC (do this deliberately,
-- one RPC at a time, so the money/charge path isn't disturbed):
--   add `perform public.require_tier('pos');` at the top of pos_checkout, etc.
-- Not applied automatically here — the current single shop is 'pro' (all on).
-- ============================================================================
