-- ============================================================================
-- Phase 5k — commission_day_rows: front_desk gets NOTHING (pre-pilot B-#1).
-- ----------------------------------------------------------------------------
-- Owner decision 2026-07-02: technicians see their OWN commission (already
-- server-forced: p_tech := auth.uid()); front desk should not see commission
-- at all. The 5j body already scoped everything by shop — this adds one line.
-- Full body otherwise identical to 5j_rpc_tenant_scoping.sql.
-- ============================================================================
create or replace function public.commission_day_rows(p_from date, p_to date, p_tech uuid default null::uuid)
returns table(tech_id uuid, tech_name text, day date, base_cents bigint, commission_cents bigint, held_cents bigint, met_min boolean)
language plpgsql security definer set search_path to 'public' as $function$
declare cfg public.commission_config; v_role text := public.current_staff_role();
begin
  if v_role is null then raise exception 'not staff'; end if;
  if v_role = 'front_desk' then return; end if;                       -- 5k
  if v_role = 'technician' then p_tech := auth.uid(); end if;
  select * into cfg from commission_config
   where shop_id = public.current_shop()
   order by updated_at desc limit 1;
  if not found then return; end if;
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
      coalesce((select b.reconciliation_pending from bookings b where b.id = r.data->>'bookingId'
                  and b.shop_id = public.current_shop()), false) as s_held
    from receipts r join payment_transactions pt on pt.invoice_id = r.id
    where r.data->>'source' = 'pos' and coalesce(pt.captured_cents,0) > 0
      and r.shop_id = public.current_shop()
      and pt.shop_id = public.current_shop()
      and pt.status not in ('pending','authorized','failed','refunded','voided','canceled')
      and (pt.created_at at time zone 'America/Chicago')::date between p_from and p_to
      and (p_tech is null or nullif(r.data->>'technicianId','')::uuid = p_tech)
  ),
  perday as (
    select s_tech, max(s_name) as nm, s_day,
           sum(case when not s_held then s_base else 0 end) as p_base,
           sum(case when s_held then s_base else 0 end) as p_held,
           count(distinct s_rid) filter (where not s_held) as p_jobs
    from sales where s_tech is not null group by s_tech, s_day
  )
  select pd.s_tech, coalesce(nullif(pd.nm,''), (select st.name from staff st where st.user_id=pd.s_tech
           and st.shop_id = public.current_shop()), '—'),
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
end $function$;
