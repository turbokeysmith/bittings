-- ============================================================================
-- Phase 2 / Stage 2b — configurable commission engine (config + server calc)
-- Applied live via mcp (phase2_2b_commission_config_and_calc + _calc_fix).
-- Commission is FILL-IN-THE-BLANK (not hardcoded): pays-on, structure,
-- exclude-parts, earned-when, hold-unreconciled are all config. The owner's
-- model is seeded (service+programming · daily-min + % · exclude parts · earned
-- on completion+collection · hold unreconciled); the % + daily-min are blank for
-- the owner to fill. Commission computes SERVER-SIDE off the tagged, collected
-- (paid) POS sales. A technician only sees their own rows; manager/owner see all.
-- Verified: base excludes parts, daily-min wins over %, tech-sees-own-only.
-- ============================================================================

create table if not exists public.commission_config (
  id int primary key default 1,
  pays_on text not null default 'service_programming' check (pays_on in ('whole_job','labor','service_programming','custom')),
  pays_on_types text[] not null default array['service','programming'],
  structure text not null default 'daily_min_pct' check (structure in ('flat_pct','daily_min_pct','tiered_pct','flat_per_job')),
  flat_pct numeric not null default 0,
  daily_min_cents int not null default 0,
  tiers jsonb not null default '[]'::jsonb,
  flat_per_job_cents int not null default 0,
  exclude_parts boolean not null default true,
  earned_when text not null default 'completion_collection' check (earned_when in ('completion_collection','completion')),
  hold_unreconciled boolean not null default true,
  updated_at timestamptz not null default now(), updated_by uuid
);
alter table public.commission_config enable row level security;
grant select, insert, update on public.commission_config to authenticated;
grant select, insert, update on public.commission_config to service_role;
drop policy if exists commcfg_select on public.commission_config;
create policy commcfg_select on public.commission_config for select to authenticated using (public.is_staff());
drop policy if exists commcfg_ins on public.commission_config;
create policy commcfg_ins on public.commission_config for insert to authenticated with check (public.is_manager());
drop policy if exists commcfg_upd on public.commission_config;
create policy commcfg_upd on public.commission_config for update to authenticated using (public.is_manager()) with check (public.is_manager());
insert into public.commission_config(id) values (1) on conflict (id) do nothing;

-- Per-tech-per-day commission from PAID POS sales, tagged by line type, per config.
-- structure: flat_pct + daily_min_pct fully implemented; flat_per_job = a per-day
-- proxy here (true per-job lands with job_staff in 2c); tiered_pct = stubbed to
-- flat_pct for now (selectable + stored; owner's path is daily_min_pct).
create or replace function public.commission_day_rows(p_from date, p_to date, p_tech uuid default null)
  returns table(tech_id uuid, tech_name text, day date, base_cents bigint, commission_cents bigint, held_cents bigint, met_min boolean)
  language plpgsql security definer set search_path = public as $$
declare cfg public.commission_config; v_role text := public.current_staff_role();
begin
  if v_role is null then raise exception 'not staff'; end if;
  if v_role = 'technician' then p_tech := auth.uid(); end if;
  select * into cfg from commission_config where id = 1;
  if not found then return; end if;
  return query
  with sales as (
    select nullif(r.data->>'technicianId','')::uuid as s_tech, coalesce(r.data->>'technician','') as s_name,
      (pt.created_at at time zone 'America/Chicago')::date as s_day,
      ( select coalesce(sum((it->>'amount')::numeric),0)*100
          from jsonb_array_elements(coalesce(r.data->'items','[]'::jsonb)) it
         where coalesce((it->>'isDiscount')::boolean,false) = false
           and not (cfg.exclude_parts and (it->>'lineType')='part')
           and case when cfg.pays_on='whole_job' then (it->>'lineType') <> 'discount'
                    when cfg.pays_on='labor' then (it->>'lineType')='labor'
                    when cfg.pays_on='service_programming' then (it->>'lineType') in ('service','programming')
                    else (it->>'lineType') = any(cfg.pays_on_types) end )::bigint as s_base,
      coalesce((select b.reconciliation_pending from bookings b where b.id = r.data->>'bookingId'), false) as s_held
    from receipts r join payment_transactions pt on pt.invoice_id = r.id
    where r.data->>'source' = 'pos' and coalesce(pt.captured_cents,0) > 0
      and pt.status not in ('pending','authorized','failed','refunded','voided','canceled')
      and (pt.created_at at time zone 'America/Chicago')::date between p_from and p_to
      and (p_tech is null or nullif(r.data->>'technicianId','')::uuid = p_tech)
  ),
  perday as (
    select s_tech, max(s_name) as nm, s_day,
           sum(case when not s_held then s_base else 0 end) as p_base,
           sum(case when s_held then s_base else 0 end) as p_held
    from sales where s_tech is not null group by s_tech, s_day
  )
  select pd.s_tech, coalesce(nullif(pd.nm,''), (select st.name from staff st where st.user_id=pd.s_tech), '—'),
         pd.s_day, pd.p_base::bigint,
         (case when cfg.structure='flat_pct' then round(pd.p_base * cfg.flat_pct/100.0)
               when cfg.structure='daily_min_pct' then greatest(cfg.daily_min_cents, round(pd.p_base * cfg.flat_pct/100.0))
               when cfg.structure='flat_per_job' then cfg.flat_per_job_cents
               else round(pd.p_base * cfg.flat_pct/100.0) end)::bigint,
         round(pd.p_held * cfg.flat_pct/100.0)::bigint,
         (cfg.structure='daily_min_pct' and round(pd.p_base*cfg.flat_pct/100.0) >= cfg.daily_min_cents)
  from perday pd;
end $$;
revoke execute on function public.commission_day_rows(date,date,uuid) from public;
grant execute on function public.commission_day_rows(date,date,uuid) to authenticated;
