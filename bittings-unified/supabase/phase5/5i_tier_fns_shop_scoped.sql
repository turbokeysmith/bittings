-- ============================================================================
-- Phase 5i — tier/subscription helpers become SHOP-SCOPED (pre-pilot #10).
-- ----------------------------------------------------------------------------
-- current_subscription(), shop_tier() and seat_usage() read the *globally
-- newest* subscriptions row / *global* staff count — with 2+ shops the tier
-- display could show the wrong shop's plan and seat counts. Scope all three by
-- current_shop(). CREATE OR REPLACE preserves the 5f grants (authenticated on
-- shop_tier/seat_usage for tier.js; current_subscription service_role-only).
-- ============================================================================

create or replace function public.current_subscription()
returns subscriptions language sql stable security definer set search_path to 'public' as $$
  select * from public.subscriptions
   where shop_id = public.current_shop()
   order by updated_at desc limit 1;
$$;

create or replace function public.shop_tier()
returns text language sql stable security definer set search_path to 'public' as $$
  select coalesce((select tier from public.subscriptions
                   where shop_id = public.current_shop()
                     and status in ('active','trialing')
                   order by updated_at desc limit 1), 'lookup');
$$;

create or replace function public.seat_usage()
returns table(used integer, allowed integer)
language sql stable security definer set search_path to 'public' as $$
  select (select count(*)::int from public.staff
           where active and shop_id = public.current_shop()),
         (select (seats_included + seats_addon) from public.subscriptions
           where shop_id = public.current_shop()
           order by updated_at desc limit 1);
$$;
