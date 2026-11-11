-- 8z53 — after-hours commission: NOT during business hours, even when the technician is not clocked in.
--
-- Owner, 2026-11-11: "he doesn't get commission unless it's after hours and is clocked out ... we need to make sure it's
-- not during business hours either, even if he is not clocked in." Until now (8z22) "after hours" meant only OFF THE
-- CLOCK, so a forgotten clock-in on a workday turned daytime sales into 25% commission.
--   • shop_open_at(shop, moment): is the shop inside its storefront hours (Settings > Hours & footer, shop_config.data.hours:
--     per day {mode: open | closed | 24, open 'HH:MM', close 'HH:MM'}) at that moment, in America/Chicago?
--     No hours saved = false, so the rule falls back to off-the-clock only.
--   • commission_day_rows part (2): a sale earns the after-hours % only when it was paid OUTSIDE those hours AND the
--     technician was not clocked in. Everything else in the function is unchanged from 8z22 (body copied from the live database).
-- Rollback: re-run phase8/8z22_pay_plans_after_hours.sql (commission_day_rows); drop function shop_open_at(uuid, timestamptz);

create or replace function public.shop_open_at(p_shop uuid, p_at timestamptz)
returns boolean language sql stable security definer set search_path to 'public' as $fn$
  with l as (select (p_at at time zone 'America/Chicago') as ts),
       d as (select c.data->'hours'->lower(to_char((select ts from l), 'Dy')) as h from shop_config c where c.shop_id = p_shop limit 1)
  select coalesce((
    select case
      when d.h is null or jsonb_typeof(d.h) <> 'object' then false
      when d.h->>'mode' = '24' then true
      when d.h->>'mode' = 'open' and (d.h->>'open') ~ '^[0-9]{2}:[0-9]{2}$' and (d.h->>'close') ~ '^[0-9]{2}:[0-9]{2}$'
        then (select ts from l)::time >= (d.h->>'open')::time and (select ts from l)::time < (d.h->>'close')::time
      else false end
    from d), false)
$fn$;
revoke execute on function public.shop_open_at(uuid, timestamptz) from public, anon;
grant  execute on function public.shop_open_at(uuid, timestamptz) to authenticated;

CREATE OR REPLACE FUNCTION public.commission_day_rows(p_from date, p_to date, p_tech uuid DEFAULT NULL::uuid)
 RETURNS TABLE(tech_id uuid, tech_name text, day date, base_cents bigint, commission_cents bigint, held_cents bigint, met_min boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare cfg public.commission_config; v_role text := public.current_staff_role(); v_shop uuid := public.current_shop();
begin
  perform public.require_tier('commission');
  if v_role is null then raise exception 'not staff'; end if;
  if v_role = 'front_desk' then return; end if;
  if v_role = 'technician' then p_tech := auth.uid(); end if;
  select * into cfg from commission_config where shop_id = v_shop order by updated_at desc limit 1;

  -- (1) the shop's commission rule — only for people on the 'commission' plan (unchanged math)
  if found then
  return query
  with sales as (
    select nullif(r.data->>'technicianId','')::uuid as s_tech, coalesce(r.data->>'technician','') as s_name,
      (pt.created_at at time zone 'America/Chicago')::date as s_day, r.id as s_rid,
      ( select coalesce(sum((it->>'amount')::numeric),0)*100
          from jsonb_array_elements(coalesce(r.data->'items','[]'::jsonb)) it
         where coalesce((it->>'isDiscount')::boolean,false) = false
           and not (cfg.exclude_parts and (it->>'lineType')='part')
           and case when cfg.pays_on='whole_job' then (it->>'lineType') <> 'discount'
                    when cfg.pays_on='labor' then (it->>'lineType')='labor'
                    when cfg.pays_on='service_programming' then (it->>'lineType') in ('service','programming')
                    else (it->>'lineType') = any(cfg.pays_on_types) end )::bigint as s_base,
      coalesce((select b.reconciliation_pending from bookings b where b.id = r.data->>'bookingId' and b.shop_id = v_shop), false) as s_held
    from receipts r join payment_transactions pt on pt.invoice_id = r.id
    where r.data->>'source' = 'pos' and coalesce(pt.captured_cents,0) > 0
      and r.shop_id = v_shop and pt.shop_id = v_shop
      and pt.status not in ('pending','authorized','failed','refunded','voided','canceled')
      and (pt.created_at at time zone 'America/Chicago')::date between p_from and p_to
      and (p_tech is null or nullif(r.data->>'technicianId','')::uuid = p_tech)
  ),
  perday as (
    select s_tech, max(s_name) as nm, s_day,
           sum(case when not s_held then s_base else 0 end) as p_base,
           sum(case when s_held then s_base else 0 end) as p_held,
           count(distinct s_rid) filter (where not s_held) as p_jobs
    from sales
    where s_tech is not null
      and not exists (select 1 from staff st where st.user_id = s_tech and st.shop_id = v_shop and st.pay_plan <> 'commission')
    group by s_tech, s_day
  )
  select pd.s_tech, coalesce(nullif(pd.nm,''), (select st.name from staff st where st.user_id=pd.s_tech and st.shop_id = v_shop), '—'),
         pd.s_day, pd.p_base::bigint,
         (case
            when cfg.structure='flat_pct'      then round(pd.p_base * cfg.flat_pct/100.0)
            when cfg.structure='daily_min_pct' then greatest(cfg.daily_min_cents, round(pd.p_base * cfg.flat_pct/100.0))
            when cfg.structure='flat_per_job'  then pd.p_jobs * cfg.flat_per_job_cents
            when cfg.structure='tiered_pct'    then round(pd.p_base * coalesce((
                   select (t->>'pct')::numeric from jsonb_array_elements(cfg.tiers) t
                    where pd.p_base <= coalesce(nullif(t->>'up_to_cents','')::bigint, 999999999999)
                    order by coalesce(nullif(t->>'up_to_cents','')::bigint, 999999999999) asc limit 1), 0)/100.0)
            else round(pd.p_base * cfg.flat_pct/100.0)
          end)::bigint,
         round(pd.p_held * cfg.flat_pct/100.0)::bigint,
         (cfg.structure='daily_min_pct' and round(pd.p_base*cfg.flat_pct/100.0) >= cfg.daily_min_cents)
  from perday pd;
  end if;

  -- (2) hourly + after-hours: pct of (sale − tax − refunds − cost) for sales paid while NOT clocked in
  return query
  with ah as (
    select coalesce(
             nullif(r.data->>'technicianId','')::uuid,
             (select b.responsible_tech from bookings b where b.shop_id = v_shop and b.id in (r.data->>'jobId', r.data->>'bookingId') and b.responsible_tech is not null limit 1),
             (select u.id from auth.users u where lower(u.email) = lower(nullif(btrim(r.data->>'technician'),'')) limit 1)
           ) as a_tech,
           pt.created_at as a_at,
           (pt.created_at at time zone 'America/Chicago')::date as a_day,
           greatest(0, coalesce(pt.base_cents,0) - coalesce(pt.tax_cents,0) - coalesce(pt.refunded_cents,0)) - coalesce(pt.cost_cents,0) as a_base
    from payment_transactions pt join receipts r on r.id = pt.invoice_id and r.shop_id = v_shop
    where pt.shop_id = v_shop and coalesce(pt.captured_cents,0) > 0
      and pt.status in ('completed','partially_refunded')
      and coalesce(r.data->>'source','') <> 'microbiz'
      and (pt.created_at at time zone 'America/Chicago')::date between p_from and p_to
  )
  select st.user_id, st.name, ah.a_day, sum(greatest(ah.a_base,0))::bigint,
         round(sum(greatest(ah.a_base,0)) * max(st.after_hours_pct) / 100.0)::bigint, 0::bigint, false
  from ah join staff st on st.user_id = ah.a_tech and st.shop_id = v_shop and st.pay_plan = 'hourly_after_hours'
  where (p_tech is null or ah.a_tech = p_tech)
    and not public.shop_open_at(v_shop, ah.a_at)   -- 8z53: never during business hours, clocked in or not
    and not exists (select 1 from time_entries te where te.user_id = ah.a_tech and te.shop_id = v_shop
                     and ah.a_at >= te.clock_in and ah.a_at < coalesce(te.clock_out, now()))
  group by st.user_id, st.name, ah.a_day;
end $function$;

notify pgrst, 'reload schema';
