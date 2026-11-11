-- ============================================================================
-- Phase 8z22 (2026-11-10) — per-person pay plans: hourly + after-hours commission
-- ----------------------------------------------------------------------------
-- Owner: "Jayden is an hourly employee — no commission on the job or during hourly pay. He only gets it
-- after hours, and it's 25% of the total minus costs." After hours = OFF THE CLOCK (owner's choice): a sale
-- earns the after-hours % only when the technician was NOT clocked in (time_entries) at the moment it was paid.
--   • staff.pay_plan: 'commission' (the shop's commission rule, as before) | 'hourly' (no commission) |
--     'hourly_after_hours' (hourly + after_hours_pct of (sale − sales tax − refunds − parts cost) off the clock).
--   • staff.after_hours_pct (default 25).
--   • staff_set_pay_plan(user, plan, pct) — owner only, audit-logged.
--   • commission_day_rows: shop-rule techs unchanged (but hourly / hourly_after_hours people are left out of it);
--     after-hours rows added for hourly_after_hours people. Which tech a sale belongs to: the receipt's technicianId,
--     else the job's responsible tech, else the technician e-mail on the receipt. History merged from MicroBiz is
--     never commissionable here.
-- Rollback: re-create commission_day_rows from phase 8l; drop function staff_set_pay_plan;
--           alter table staff drop column pay_plan, drop column after_hours_pct;
-- ============================================================================
alter table public.staff add column if not exists pay_plan text not null default 'commission';
alter table public.staff add column if not exists after_hours_pct numeric not null default 25;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'staff_pay_plan_chk') then
    alter table public.staff add constraint staff_pay_plan_chk check (pay_plan in ('commission','hourly','hourly_after_hours'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'staff_after_hours_pct_chk') then
    alter table public.staff add constraint staff_after_hours_pct_chk check (after_hours_pct >= 0 and after_hours_pct <= 100);
  end if;
end $$;

create or replace function public.staff_set_pay_plan(p_user uuid, p_plan text, p_pct numeric default 25)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_old record;
begin
  if public.current_staff_role() <> 'owner' then raise exception 'only the owner can change pay plans'; end if;
  if p_plan not in ('commission','hourly','hourly_after_hours') then raise exception 'unknown pay plan'; end if;
  select pay_plan, after_hours_pct into v_old from staff where user_id = p_user and shop_id = public.current_shop();
  if not found then raise exception 'not on this shop''s team'; end if;
  update staff set pay_plan = p_plan, after_hours_pct = coalesce(p_pct, 25), updated_at = now()
   where user_id = p_user and shop_id = public.current_shop();
  insert into audit_log(user_id, role, action, entity_type, entity_id, shop_id, detail)
    values (auth.uid(), 'owner', 'pay_plan', 'staff', p_user::text, public.current_shop(),
            jsonb_build_object('before', v_old.pay_plan, 'before_pct', v_old.after_hours_pct, 'after', p_plan, 'after_pct', p_pct));
end $function$;
revoke execute on function public.staff_set_pay_plan(uuid, text, numeric) from public, anon;
grant  execute on function public.staff_set_pay_plan(uuid, text, numeric) to authenticated;

create or replace function public.commission_day_rows(p_from date, p_to date, p_tech uuid default null)
returns table(tech_id uuid, tech_name text, day date, base_cents bigint, commission_cents bigint, held_cents bigint, met_min boolean)
language plpgsql security definer set search_path to 'public' as $function$
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
    and not exists (select 1 from time_entries te where te.user_id = ah.a_tech and te.shop_id = v_shop
                     and ah.a_at >= te.clock_in and ah.a_at < coalesce(te.clock_out, now()))
  group by st.user_id, st.name, ah.a_day;
end $function$;

-- Jayden: hourly, 25% after hours (owner, 10 Nov)
update public.staff set pay_plan = 'hourly_after_hours', after_hours_pct = 25
 where user_id = 'b64b9a8d-24b1-49f9-865a-300197497b8b' and shop_id = '7a1754e6-e2f1-40eb-9c03-9d9a1e891bce';
