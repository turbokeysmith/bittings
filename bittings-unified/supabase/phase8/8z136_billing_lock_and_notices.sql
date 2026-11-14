-- ============================================================================
-- Phase 8 · 8z136 — Bittings' own billing: grace + lock, founder-price notice, plan matrix
-- (owner, 2026-11-13: "yes build it with 7 days of grace")
-- ----------------------------------------------------------------------------
-- 1. subscriptions gets the dates the billing rules need (written only by the Stripe listener
--    `billing-webhook` and the daily check `billing-notices`, both service_role).
-- 2. shop_tier() — a shop's plan counts while it is paid up, and for 7 days after a failed payment.
--    After that, or with no subscription at all, the answer is 'none' and NOTHING is included.
--    (Before: a shop that never paid, or stopped paying, silently got the Lookup tools for free.)
-- 3. tier_feature(tier, feature) — the plan → feature table as one pure function, so a test can read
--    the whole table and compare it with the app's copy (app/tier.js). tier_allows() uses it.
--    New features: estimates, leads (Starter and up); timesheets, keysystems (Pro).
-- 4. billing_state() — what the app shows: ok / past_due (banner) / locked / ended / none (lock screen).
-- 5. billing_runs — one row per run of the daily check (service_role only).
-- 6. The daily check itself: pg_cron calls the billing-notices function every day at 14:15 UTC.
--
-- No shop changes plan by applying this: both shops today are 'pro' + 'active' with no Stripe
-- subscription, which stays "paid up" (they are not billed through Stripe).
--
-- Rollback: re-apply phase5/5i_tier_fns_shop_scoped.sql and the tier_allows() of phase8 (8k);
--   select cron.unschedule('billing-notices-daily');
--   drop function public.billing_state(); drop function public.tier_feature(text,text);
-- Apply:  npx supabase@3.0.0 db query --remote --yes --file bittings-unified/supabase/phase8/8z136_billing_lock_and_notices.sql
-- ============================================================================

-- 1) the dates -----------------------------------------------------------------
alter table public.subscriptions
  add column if not exists past_due_since         timestamptz,   -- first failed payment of the current episode
  add column if not exists founder_ends_at        timestamptz,   -- when the founder discount ends (from Stripe)
  add column if not exists price_notice_sent_at   timestamptz,   -- the 30-day notice: when it was emailed …
  add column if not exists price_notice_for       timestamptz,   -- … and which end date it named
  add column if not exists payment_notice_sent_at timestamptz,   -- "your payment did not go through" emailed
  add column if not exists lock_notice_sent_at    timestamptz,   -- "Bittings is paused" emailed
  add column if not exists cancel_at              timestamptz;   -- the owner has asked to cancel on this date

-- 2) grace + lock ----------------------------------------------------------------
create or replace function public.billing_grace_days()
returns integer language sql immutable set search_path to 'public' as $$ select 7 $$;

create or replace function public.shop_tier()
returns text language sql stable security definer set search_path to 'public' as $$
  select coalesce((
    select case
             when s.status in ('active','trialing') then s.tier
             when s.status = 'past_due'
                  and coalesce(s.past_due_since, now()) > now() - make_interval(days => public.billing_grace_days())
               then s.tier
             else 'none'
           end
      from public.subscriptions s
     where s.shop_id = public.current_shop()
     order by s.updated_at desc limit 1), 'none');
$$;

-- 3) the plan → feature table ------------------------------------------------------
create or replace function public.tier_feature(p_tier text, p_feature text)
returns boolean language sql immutable set search_path to 'public' as $$
  select case
    when p_tier is null or p_tier not in ('lookup','starter','pro') then false
    -- reference tools: every plan
    when p_feature in ('lookup','keycodes','programmers','lishi') then true
    -- running the counter and the van: Starter and up
    when p_feature in ('pos','receipts','customers','inventory','scheduler','fitment','estimates','leads')
      then p_tier in ('starter','pro')
    -- a shop with a team: Pro
    when p_feature in ('commission','fleet','reports','dashboard','nastf','closeout','move_requests','timesheets','keysystems')
      then p_tier = 'pro'
    else false
  end;
$$;

create or replace function public.tier_allows(feature text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.tier_feature(public.shop_tier(), feature);
$$;

create or replace function public.require_tier(feature text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_tier text := public.shop_tier();
begin
  if not public.tier_feature(v_tier, feature) then
    if v_tier = 'none' then
      raise exception 'TIER_LOCKED: this shop has no active Bittings plan — the owner needs to update the payment method or choose a plan'
        using errcode = '42501';
    end if;
    raise exception 'TIER_LOCKED: % requires a higher plan (current: %)', feature, v_tier using errcode = '42501';
  end if;
end;
$$;

-- 4) what the app shows ------------------------------------------------------------
create or replace function public.billing_state()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_shop  uuid := public.current_shop();
  v_owner boolean := false;
  s       public.subscriptions;
  g       integer := public.billing_grace_days();
  v_state text;
  v_ends  timestamptz;
begin
  if v_shop is null then return jsonb_build_object('state', 'unknown'); end if;
  select exists (select 1 from public.shop_members m
                  where m.shop_id = v_shop and m.user_id = auth.uid() and m.active and m.role = 'owner')
    into v_owner;
  select * into s from public.subscriptions where shop_id = v_shop order by updated_at desc limit 1;
  if not found then
    return jsonb_build_object('state', 'none', 'tier', 'none', 'is_owner', v_owner, 'grace_days', g, 'billed', false);
  end if;

  if s.status in ('active','trialing') then
    v_state := 'ok';
  elsif s.status = 'past_due' then
    v_ends  := coalesce(s.past_due_since, now()) + make_interval(days => g);
    v_state := case when now() < v_ends then 'past_due' else 'locked' end;
  elsif s.stripe_subscription_id is not null then
    v_state := 'ended';     -- had a plan, it was cancelled
  else
    v_state := 'none';      -- never had one
  end if;

  return jsonb_build_object(
    'state', v_state, 'tier', public.shop_tier(), 'plan', s.tier, 'status', s.status, 'is_owner', v_owner,
    'billed', s.stripe_subscription_id is not null,
    'past_due_since', s.past_due_since, 'grace_ends_at', v_ends, 'grace_days', g,
    'founder_ends_at', s.founder_ends_at, 'price_notice_sent_at', s.price_notice_sent_at, 'cancel_at', s.cancel_at);
end;
$$;

-- tier_feature / billing_grace_days are pure look-ups of what the website's Plans section already says,
-- so anyone may call them (the read-only checker tools/qa/plans-matrix-check.js does). billing_state is per shop.
grant execute on function public.billing_grace_days(), public.tier_feature(text, text) to public;
revoke all on function public.billing_state() from public;
grant execute on function public.billing_state() to authenticated;

-- 5) the daily check's log -----------------------------------------------------------
create table if not exists public.billing_runs (
  id      bigint generated always as identity primary key,
  ran_at  timestamptz not null default now(),
  summary jsonb
);
alter table public.billing_runs enable row level security;      -- no policies: nobody but service_role
revoke all on public.billing_runs from anon, authenticated;
grant select, insert, update on public.billing_runs to service_role;
do $$ begin   -- the read-only checker may see the log
  if exists (select 1 from pg_roles where rolname = 'supabase_read_only_user') then
    grant select on public.billing_runs to supabase_read_only_user;
  end if;
end $$;

-- 6) once a day ----------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule(jobid) from cron.job where jobname = 'billing-notices-daily';
select cron.schedule('billing-notices-daily', '15 14 * * *', $cron$
  select net.http_post(
    url := 'https://gcshuhlksjznksspbigl.supabase.co/functions/v1/billing-notices',
    headers := '{"content-type":"application/json"}'::jsonb,
    body := '{"source":"cron"}'::jsonb,
    timeout_milliseconds := 60000);
$cron$);
