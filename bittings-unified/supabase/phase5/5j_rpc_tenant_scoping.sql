-- ============================================================================
-- Phase 5j — every SECURITY DEFINER RPC gets a shop_id = current_shop() fence
-- (pre-pilot review 🔴 #3). inventory_dashboard was the template.
-- ----------------------------------------------------------------------------
-- The Phase-5 RESTRICTIVE table fence protects DIRECT PostgREST access, but
-- these DEFINER RPCs bypass RLS and previously acted on any ID they were
-- given (role-checked, not shop-checked). Every lookup/update below is now
-- scoped to the caller's shop; cross-shop IDs read as "not found".
--
-- Also folds in: commission_config becomes per-shop (same singleton pattern
-- shop_config had — the client wrote id=1; commission_day_rows read id=1).
--
-- Bodies are the LIVE definitions (live DB was authoritative for pos_checkout)
-- with only the scoping edits — marked with `-- 5j:` comments.
-- ============================================================================

-- ---------------------------------------------------------------- structural:
-- commission_config: one row per shop (existing row keeps id=1).
create sequence if not exists public.commission_config_id_seq owned by public.commission_config.id;
select setval('public.commission_config_id_seq', greatest((select coalesce(max(id),1) from public.commission_config), 1));
alter table public.commission_config alter column id set default nextval('public.commission_config_id_seq');
grant usage, select on sequence public.commission_config_id_seq to authenticated, service_role;
create unique index if not exists commission_config_one_per_shop on public.commission_config(shop_id);

-- ------------------------------------------------------------------ helpers:
create or replace function public.is_own_job(p_job text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists(select 1 from public.job_staff js
                 where js.job_id = p_job and js.user_id = auth.uid()
                   and js.shop_id = public.current_shop())            -- 5j
$$;

-- ------------------------------------------------------------------ NASTF/D1:
create or replace function public.can_file_d1(p_receipt text)
returns boolean language plpgsql security definer set search_path to 'public' as $function$
declare v_data jsonb;
begin
  if public.current_staff_role() is null then return false; end if;
  select data into v_data from receipts
   where id = p_receipt and deleted_at is null
     and shop_id = public.current_shop();                             -- 5j
  if v_data is null then return false; end if;
  if public.is_manager() then return true; end if;
  if nullif(v_data->>'technicianId','') is not null and (v_data->>'technicianId')::uuid = auth.uid() then return true; end if;
  if exists (select 1 from job_staff js where js.job_id = v_data->>'bookingId' and js.user_id = auth.uid()
               and js.shop_id = public.current_shop()) then return true; end if;   -- 5j
  return false;
end $function$;

create or replace function public.set_d1_filed(p_receipt text, p_filed boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_data jsonb; v_role text := public.current_staff_role(); v_name text; v_nastf jsonb;
begin
  if v_role is null then raise exception 'not staff'; end if;
  select data into v_data from receipts
   where id = p_receipt and deleted_at is null
     and shop_id = public.current_shop();                             -- 5j
  if v_data is null then raise exception 'receipt not found'; end if;
  if (v_data->'nastf'->>'type') is null then raise exception 'not a NASTF job'; end if;
  if not public.can_file_d1(p_receipt) then
    raise exception 'only the staff who did this job or a manager can file D1';
  end if;
  select name into v_name from staff where user_id = auth.uid();
  v_nastf := coalesce(v_data->'nastf','{}'::jsonb)
    || jsonb_build_object('d1Filed', p_filed,
         'd1FiledAt', case when p_filed then now()::text else null end,
         'd1FiledBy', case when p_filed then auth.uid()::text else null end,
         'd1FiledByName', case when p_filed then coalesce(v_name, '') else null end);
  update receipts set data = jsonb_set(data, '{nastf}', v_nastf), updated_at = now()
   where id = p_receipt and shop_id = public.current_shop();          -- 5j
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, case when p_filed then 'd1_filed' else 'd1_unfiled' end, 'receipts', p_receipt,
            jsonb_build_object('type', v_data->'nastf'->>'type'));
  return v_nastf;
end $function$;

create or replace function public.nastf_worklist(p_include_filed boolean default true)
returns table(id text, number text, customer text, doc_date text, nastf_type text, d1_due date, d1_days integer, d1_filed boolean, d1_filed_by_name text, can_file boolean)
language plpgsql security definer set search_path to 'public' as $function$
begin
  if public.current_staff_role() is null then raise exception 'not staff'; end if;
  return query
  select r.id,
         coalesce(nullif(r.data->>'number',''), r.id),
         coalesce(r.data->>'customer',''),
         coalesce(r.data->>'date', to_char(r.created_at at time zone 'America/Chicago','YYYY-MM-DD')),
         r.data->'nastf'->>'type',
         nullif(r.data->'nastf'->>'d1DueDate','')::date,
         coalesce(nullif(r.data->'nastf'->>'d1Days','')::int, 5),
         coalesce((r.data->'nastf'->>'d1Filed')::boolean, false),
         r.data->'nastf'->>'d1FiledByName',
         ( public.is_manager()
           or (nullif(r.data->>'technicianId','') is not null and (r.data->>'technicianId')::uuid = auth.uid())
           or exists (select 1 from job_staff js where js.job_id = r.data->>'bookingId' and js.user_id = auth.uid()
                        and js.shop_id = public.current_shop()) )     -- 5j
    from receipts r
   where r.deleted_at is null and (r.data->'nastf'->>'type') is not null
     and r.shop_id = public.current_shop()                            -- 5j
     and (p_include_filed or not coalesce((r.data->'nastf'->>'d1Filed')::boolean, false))
   order by coalesce((r.data->'nastf'->>'d1Filed')::boolean, false) asc,
            nullif(r.data->'nastf'->>'d1DueDate','')::date asc nulls last,
            r.created_at desc;
end $function$;

-- ------------------------------------------------------------------ sign-off:
create or replace function public.jobs_awaiting_signoff()
returns table(job_id text, customer text, status text, reconciliation_pending boolean, responsible_tech uuid, tech_name text, cancel_reason text, cancel_detail text, updated_at timestamp with time zone, data jsonb)
language sql security definer set search_path to 'public' as $function$
  select b.id, b.customer_name, b.status, b.reconciliation_pending, b.responsible_tech,
         (select s.name from staff s where s.user_id = b.responsible_tech
            and s.shop_id = public.current_shop()),                   -- 5j
         b.cancel_reason, b.cancel_detail, b.updated_at, b.data
  from bookings b
  where public.is_manager()
    and b.shop_id = public.current_shop()                             -- 5j
    and (b.reconciliation_pending = true or coalesce((b.data->>'needsManagerSignoff')::boolean,false) = true)
    and b.deleted_at is null
  order by b.updated_at desc;
$function$;

-- ---------------------------------------------------------------- commission:
create or replace function public.commission_day_rows(p_from date, p_to date, p_tech uuid default null::uuid)
returns table(tech_id uuid, tech_name text, day date, base_cents bigint, commission_cents bigint, held_cents bigint, met_min boolean)
language plpgsql security definer set search_path to 'public' as $function$
declare cfg public.commission_config; v_role text := public.current_staff_role();
begin
  if v_role is null then raise exception 'not staff'; end if;
  if v_role = 'technician' then p_tech := auth.uid(); end if;
  select * into cfg from commission_config
   where shop_id = public.current_shop()                              -- 5j (was id = 1)
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
                  and b.shop_id = public.current_shop()), false) as s_held      -- 5j
    from receipts r join payment_transactions pt on pt.invoice_id = r.id
    where r.data->>'source' = 'pos' and coalesce(pt.captured_cents,0) > 0
      and r.shop_id = public.current_shop()                           -- 5j
      and pt.shop_id = public.current_shop()                          -- 5j
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
           and st.shop_id = public.current_shop()), '—'),             -- 5j
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

-- ----------------------------------------------------------------- inventory:
create or replace function public.inv_move(p_item text, p_from text, p_to text, p_qty integer)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_have int; v_ser boolean;
begin
  if public.current_staff_role() not in ('owner','manager','technician') then raise exception 'move requires technician, manager, or owner'; end if;
  if p_qty <= 0 then raise exception 'qty must be positive'; end if;
  if p_from = p_to then raise exception 'from and to are the same location'; end if;
  select coalesce(serialized,false) into v_ser from inventory
   where id = p_item and shop_id = public.current_shop();             -- 5j
  if not found then raise exception 'item not found in your shop'; end if;   -- 5j
  if v_ser then
    select count(*) into v_have from inventory_units where item_id=p_item and location=p_from and status='in_stock'
      and shop_id = public.current_shop();                            -- 5j
    if coalesce(v_have,0) < p_qty then raise exception 'not enough stock at %', p_from; end if;
    update inventory_units set location=p_to, updated_at=now()
      where id in (select id from inventory_units where item_id=p_item and location=p_from and status='in_stock'
                     and shop_id = public.current_shop()              -- 5j
                   order by acquired_at limit p_qty);
  else
    select coalesce(qty,0) into v_have from inventory_locations where item_id = p_item and location = p_from
      and shop_id = public.current_shop();                            -- 5j
    if coalesce(v_have,0) < p_qty then raise exception 'not enough stock at %', p_from; end if;
    update inventory_locations set qty = qty - p_qty, updated_at = now()
     where item_id = p_item and location = p_from and shop_id = public.current_shop();   -- 5j
    insert into inventory_locations(item_id, location, qty) values (p_item, p_to, p_qty)
      on conflict (item_id, location) do update set qty = inventory_locations.qty + excluded.qty, updated_at = now();
  end if;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), public.current_staff_role(), 'inventory_move', 'inventory', p_item,
            jsonb_build_object('from', p_from, 'to', p_to, 'qty', p_qty, 'serialized', v_ser));
end $function$;

create or replace function public.inv_receive(p_item text, p_qty integer)
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if public.current_staff_role() not in ('owner','manager','front_desk') then raise exception 'receive requires front desk, manager, or owner'; end if;
  if p_qty <= 0 then raise exception 'qty must be positive'; end if;
  if not exists (select 1 from inventory where id = p_item and shop_id = public.current_shop()) then
    raise exception 'item not found in your shop';                    -- 5j (was: none at all)
  end if;
  insert into inventory_locations(item_id, location, qty) values (p_item, 'shop', p_qty)
    on conflict (item_id, location) do update set qty = inventory_locations.qty + excluded.qty, updated_at = now();
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), public.current_staff_role(), 'inventory_receive', 'inventory', p_item,
            jsonb_build_object('location', 'shop', 'qty', p_qty));
end $function$;

create or replace function public.inv_adjust(p_item text, p_loc text, p_new_qty integer, p_reason text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_old int; v_ser boolean; v_cost int; i int;
begin
  if not public.is_manager() then raise exception 'adjust/write-off requires manager or owner'; end if;
  if p_new_qty < 0 then raise exception 'qty cannot be negative'; end if;
  select coalesce(serialized,false) into v_ser from inventory
   where id = p_item and shop_id = public.current_shop();             -- 5j
  if not found then raise exception 'item not found in your shop'; end if;   -- 5j
  if v_ser then
    select count(*) into v_old from inventory_units where item_id=p_item and location=p_loc and status='in_stock'
      and shop_id = public.current_shop();                            -- 5j
    if p_new_qty < v_old then
      update inventory_units set status='written_off', disposition=coalesce(nullif(p_reason,''),'adjust'), updated_at=now()
        where id in (select id from inventory_units where item_id=p_item and location=p_loc and status='in_stock'
                       and shop_id = public.current_shop()            -- 5j
                     order by acquired_at limit (v_old - p_new_qty));
    elsif p_new_qty > v_old then
      select round(coalesce(cost,0)*100)::int into v_cost from inventory
       where id=p_item and shop_id = public.current_shop();           -- 5j
      for i in 1..(p_new_qty - v_old) loop
        insert into inventory_units(item_id, location, supplier, batch, unit_cost_cents, disposition, shop_id, created_by)
          values (p_item, p_loc, '(adjustment)', '', v_cost, coalesce(nullif(p_reason,''),'adjust'), public.current_shop(), auth.uid());
      end loop;
    end if;
  else
    select coalesce(qty,0) into v_old from inventory_locations where item_id = p_item and location = p_loc
      and shop_id = public.current_shop();                            -- 5j
    insert into inventory_locations(item_id, location, qty) values (p_item, p_loc, p_new_qty)
      on conflict (item_id, location) do update set qty = excluded.qty, updated_at = now();
  end if;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), public.current_staff_role(), 'inventory_adjust', 'inventory', p_item,
            jsonb_build_object('location', p_loc, 'old', coalesce(v_old,0), 'new', p_new_qty, 'reason', coalesce(p_reason,''), 'serialized', v_ser));
end $function$;

-- ---------------------------------------------------------------------- jobs:
create or replace function public.job_set_status(p_job text, p_status text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_role text; v_unrec int;
begin
  v_role := public.current_staff_role();
  if v_role is null then raise exception 'not staff'; end if;
  if not exists (select 1 from public.bookings where id = p_job and shop_id = public.current_shop()) then
    raise exception 'job not found in your shop';                     -- 5j
  end if;
  if p_status not in ('scheduled','en_route','on_site','in_progress','completed','on_hold','canceled') then raise exception 'invalid status'; end if;
  if v_role = 'front_desk' then raise exception 'front desk cannot change job status'; end if;
  if v_role = 'technician' and not public.is_own_job(p_job) then raise exception 'technicians can only update their own jobs'; end if;
  if p_status = 'completed' then
    select count(*) into v_unrec from public.job_parts where job_id = p_job and state = 'pending'
      and shop_id = public.current_shop();                            -- 5j
    if v_unrec > 0 then raise exception 'cannot complete: % part(s) still need reconciling', v_unrec; end if;
  end if;
  perform set_config('app.allow_status', '1', true);
  update public.bookings set status = p_status, completed_at = (case when p_status='completed' then now() else completed_at end), updated_at = now()
   where id = p_job and shop_id = public.current_shop();              -- 5j
  perform set_config('app.allow_status', '', true);
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'job_status', 'bookings', p_job, jsonb_build_object('status', p_status));
end $function$;

create or replace function public.job_cancel(p_job text, p_reason text, p_detail text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_role text; v_status text; v_unrec int; v_tech uuid;
begin
  v_role := public.current_staff_role();
  if v_role is null then raise exception 'not staff'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'a cancellation reason is required'; end if;
  select status into v_status from public.bookings
   where id = p_job and shop_id = public.current_shop();              -- 5j
  if not found then raise exception 'job not found in your shop'; end if;    -- 5j
  if v_role = 'front_desk' and coalesce(v_status,'') <> 'scheduled' then raise exception 'front desk can only cancel a job that is still scheduled'; end if;
  if v_role = 'technician' and not public.is_own_job(p_job) then raise exception 'technicians can only cancel their own jobs'; end if;
  select count(*) into v_unrec from public.job_parts where job_id = p_job and state = 'pending'
    and shop_id = public.current_shop();                              -- 5j
  select user_id into v_tech from public.job_staff where job_id = p_job and job_role = 'lead'
    and shop_id = public.current_shop() limit 1;                      -- 5j
  perform set_config('app.allow_status', '1', true);
  update public.bookings set status = 'canceled', cancel_reason = p_reason, cancel_detail = coalesce(p_detail,''),
         reconciliation_pending = (v_unrec > 0), responsible_tech = case when v_unrec > 0 then v_tech else responsible_tech end, updated_at = now()
   where id = p_job and shop_id = public.current_shop();              -- 5j
  perform set_config('app.allow_status', '', true);
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'job_cancel', 'bookings', p_job, jsonb_build_object('reason', p_reason, 'detail', p_detail, 'unreconciled', v_unrec, 'reconciliation_pending', (v_unrec > 0)));
end $function$;

create or replace function public.job_reconcile_part(p_part uuid, p_state text, p_proof text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_role text; v_job text; v_cut boolean;
begin
  v_role := public.current_staff_role(); if v_role is null then raise exception 'not staff'; end if;
  if p_state not in ('used','returned') then raise exception 'state must be used or returned'; end if;
  select job_id, is_cut_key into v_job, v_cut from public.job_parts
   where id = p_part and shop_id = public.current_shop();             -- 5j
  if v_job is null then raise exception 'part not found'; end if;
  if v_role = 'technician' and not public.is_own_job(v_job) then raise exception 'technicians can only reconcile their own jobs'; end if;
  if v_cut and p_state = 'returned' and coalesce(trim(p_proof), '') = '' then raise exception 'returning a cut key requires proof (a photo)'; end if;
  update public.job_parts set state = p_state, proof_path = coalesce(nullif(p_proof,''), proof_path), reconciled_at = now(), reconciled_by = auth.uid()
   where id = p_part and shop_id = public.current_shop();             -- 5j
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'job_part_reconcile', 'job_parts', p_part::text, jsonb_build_object('state', p_state, 'has_proof', (coalesce(trim(p_proof),'') <> '')));
end $function$;

create or replace function public.job_release_hold(p_job text, p_action text, p_note text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_role text := public.current_staff_role();
begin
  if not public.is_manager() then raise exception 'only a manager or owner can sign off a hold'; end if;
  if p_action not in ('release','uphold') then raise exception 'action must be release or uphold'; end if;
  if not exists (select 1 from bookings where id = p_job and shop_id = public.current_shop()) then
    raise exception 'job not found in your shop';                     -- 5j
  end if;
  if p_action = 'release' then
    perform set_config('app.allow_status','1',true);
    update bookings
       set reconciliation_pending = false,
           data = jsonb_set(coalesce(data,'{}'::jsonb), '{needsManagerSignoff}', 'false'::jsonb),
           updated_at = now()
     where id = p_job and shop_id = public.current_shop();            -- 5j
    perform set_config('app.allow_status','',true);
  end if;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'job_signoff', 'bookings', p_job, jsonb_build_object('action', p_action, 'note', coalesce(p_note,'')));
end $function$;

-- ----------------------------------------------------------------------- POS:
create or replace function public.pos_decrement_stock(p_receipt text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_data jsonb; v_loc text; v_item jsonb; v_id text; v_qty int; v_ser boolean; v_cust uuid;
begin
  if public.current_staff_role() is null then raise exception 'not staff'; end if;
  select data into v_data from receipts
   where id = p_receipt and shop_id = public.current_shop();          -- 5j
  if v_data is null then raise exception 'receipt not found'; end if;
  if coalesce((v_data->>'posStockApplied')::boolean, false) then return; end if;
  v_loc := coalesce(nullif(v_data->>'posLocation',''),'shop');
  v_cust := case when (v_data->>'customerId') ~ '^[0-9a-fA-F-]{36}$' then (v_data->>'customerId')::uuid else null end;
  for v_item in select value from jsonb_array_elements(coalesce(v_data->'items','[]'::jsonb)) loop
    if nullif(v_item->>'partId','') is null then continue; end if;
    v_id := v_item->>'partId'; v_qty := coalesce((v_item->>'qty')::int, 1);
    select coalesce(serialized,false) into v_ser from inventory
     where id = v_id and shop_id = public.current_shop();             -- 5j
    if not found then continue; end if;                               -- 5j: unknown/foreign item — never touch rows
    if v_ser then
      update inventory_units set status='sold', sold_receipt_id=p_receipt, sold_customer_id=v_cust, sold_at=now(), updated_at=now()
        where id in (select id from inventory_units where item_id=v_id and location=v_loc and status='in_stock'
                       and shop_id = public.current_shop()            -- 5j
                     order by acquired_at limit v_qty);
    else
      insert into inventory_locations(item_id, location, qty) values (v_id, v_loc, 0) on conflict (item_id, location) do nothing;
      update inventory_locations set qty = greatest(0, coalesce(qty,0) - v_qty), updated_at=now()
       where item_id=v_id and location=v_loc and shop_id = public.current_shop();   -- 5j
    end if;
    insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
      values (auth.uid(), public.current_staff_role(), 'pos_sold', 'inventory', v_id, jsonb_build_object('location', v_loc, 'qty', v_qty, 'receipt', p_receipt, 'serialized', v_ser));
  end loop;
  update receipts set data = jsonb_set(data, '{posStockApplied}', 'true'::jsonb), updated_at=now()
   where id = p_receipt and shop_id = public.current_shop();          -- 5j
end $function$;

create or replace function public.pos_checkout(p_payload jsonb)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare
  v_role text := public.current_staff_role();
  v_disc int := coalesce(nullif(p_payload->>'discountCents','')::int, 0);
  v_taxrate numeric := coalesce(nullif(p_payload->>'taxRate','')::numeric, 0);
  v_id text := 'pos_' || replace(gen_random_uuid()::text,'-','');
  v_items jsonb := '[]'::jsonb;
  v_line jsonb; v_type text; v_qty int; v_price int; v_catalog int; v_cost numeric; v_desc text; v_taxable boolean; v_lt text; v_override boolean;
  v_inv record; v_svc record; v_data jsonb; v_sname text; v_sprice text; v_svcval text; v_veh jsonb := coalesce(p_payload->'vehicle','null'::jsonb);
  v_nastf jsonb := null; v_d1days int;
begin
  if v_role is null then raise exception 'not staff'; end if;
  for v_line in select value from jsonb_array_elements(coalesce(p_payload->'lines','[]'::jsonb)) loop
    v_type := coalesce(v_line->>'type','service');
    v_qty  := greatest(1, coalesce(nullif(v_line->>'qty','')::int, 1));
    v_override := (v_line ? 'priceCents') and nullif(v_line->>'priceCents','') is not null;
    v_cost := null; v_taxable := coalesce((v_line->>'taxable')::boolean, false); v_lt := v_type; v_catalog := 0;
    if v_type = 'part' then
      select * into v_inv from inventory where id = v_line->>'itemId'
        and shop_id = public.current_shop();                          -- 5j
      if v_inv.id is null then raise exception 'part not found: %', v_line->>'itemId'; end if;
      v_catalog := coalesce(v_inv.sell_price_cents, 0); v_price := v_catalog;
      v_cost := v_inv.cost; v_desc := v_inv.name; v_taxable := true; v_lt := 'part';
      if v_override then
        if v_catalog > 0 and not public.is_manager() then raise exception 'only a manager can change a set price'; end if;
        v_price := (v_line->>'priceCents')::int;
      end if;
    elsif (v_line ? 'svc') and nullif(v_line->>'svc','') is not null then
      v_svcval := v_line->>'svc';
      select coalesce(s->>'value', s->>'en'), s->>'price' into v_sname, v_sprice
        from shop_config sc, jsonb_array_elements(coalesce(sc.data->'services','[]'::jsonb)) s
       where sc.shop_id = public.current_shop()                       -- 5j (was sc.id = 1)
         and s->>'value' = v_svcval and (nullif(v_line->>'cat','') is null or s->>'cat' = v_line->>'cat') limit 1;
      if v_sname is null then raise exception 'service not found in Setup: %', v_svcval; end if;
      v_catalog := round(coalesce(nullif(v_sprice,'')::numeric, 0) * 100); v_price := v_catalog;
      v_desc := v_sname; v_lt := case when v_svcval ilike '%program%' then 'programming' when v_svcval ilike '%labor%' then 'labor' else 'service' end;
      if v_override then
        if v_catalog > 0 and not public.is_manager() then raise exception 'only a manager can change a set price'; end if;
        v_price := (v_line->>'priceCents')::int;
      end if;
    elsif (v_line ? 'serviceId') and nullif(v_line->>'serviceId','') is not null then
      select * into v_svc from services where id = (v_line->>'serviceId')::uuid
        and shop_id = public.current_shop();                          -- 5j
      if v_svc.id is null then raise exception 'service not found'; end if;
      v_catalog := coalesce(v_svc.price_cents,0); v_price := v_catalog; v_desc := v_svc.name; v_lt := v_svc.category;
      if v_override then
        if v_catalog > 0 and not public.is_manager() then raise exception 'only a manager can change a set price'; end if;
        v_price := (v_line->>'priceCents')::int;
      end if;
    else
      -- custom / "Other" (unlisted) line: ANY staff may add it with the price they enter
      -- (setting a price for an unlisted item, not changing a set catalog price). Discounts
      -- + changing a set price stay manager-only above.
      v_price := coalesce(nullif(v_line->>'priceCents','')::int, 0);
      if v_price <= 0 then raise exception 'an Other/custom line needs a price'; end if;
      v_desc := coalesce(nullif(v_line->>'desc',''),'Service');
      v_lt := coalesce(nullif(v_line->>'lineType',''), nullif(v_line->>'type',''), 'service');
      if v_lt = 'custom' then v_lt := 'service'; end if;
    end if;
    v_items := v_items || jsonb_build_object(
      'desc', v_desc, 'amount', round((v_price*v_qty)/100.0, 2), 'qty', v_qty, 'taxable', v_taxable, 'lineType', v_lt,
      'partId', case when v_type='part' then v_line->>'itemId' else null end,
      'serviceId', case when v_line ? 'serviceId' then v_line->>'serviceId' else null end,
      'svc', case when v_line ? 'svc' then v_line->>'svc' else null end,
      'cost', case when v_cost is not null then round(v_cost*v_qty, 2) else null end,
      'unitCost', case when v_cost is not null then v_cost else null end);
  end loop;
  if v_disc <> 0 and not public.is_manager() then raise exception 'only a manager can apply a discount'; end if;
  if v_disc > 0 then
    v_items := v_items || jsonb_build_object('desc', coalesce(nullif(p_payload->>'discountReason',''),'Discount'),
      'isDiscount', true, 'discountMode','amount', 'discountValue', round(v_disc/100.0,2), 'lineType','discount');
  end if;
  if nullif(p_payload->>'nastf','') is not null then
    v_d1days := coalesce((select nullif(sc.data->'nastf'->>'d1Days','')::int from shop_config sc
                           where sc.shop_id = public.current_shop()), 5);   -- 5j (was sc.id = 1)
    if v_d1days < 1 then v_d1days := 5; end if;
    v_nastf := jsonb_build_object('type', p_payload->>'nastf', 'd1Days', v_d1days,
                 'd1DueDate', (current_date + v_d1days)::text, 'd1Filed', false);
  end if;
  v_data := jsonb_build_object(
    'id', v_id, 'number', v_id, 'docType','receipt', 'source','pos',
    'customer', coalesce(p_payload->>'customer',''), 'customerId', p_payload->>'customerId',
    'phone', p_payload->>'phone', 'email', p_payload->>'email', 'bookingId', p_payload->>'bookingId',
    'technician', p_payload->>'technician', 'technicianId', p_payload->>'technicianId',
    'posLocation', coalesce(nullif(p_payload->>'location',''),'shop'),
    'vehicle', case when v_veh = 'null'::jsonb then null else v_veh end,
    'vehYear', v_veh->>'year', 'vehMake', v_veh->>'make', 'vehModel', v_veh->>'model', 'vin', v_veh->>'vin',
    'nastf', v_nastf,
    'taxRate', v_taxrate, 'status','Unpaid', 'items', v_items);
  insert into public.receipts(id, data) values (v_id, v_data);
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'pos_checkout', 'receipts', v_id, jsonb_build_object('lines', jsonb_array_length(v_items), 'discount_cents', v_disc, 'nastf', (v_nastf is not null)));
  return v_id;
end $function$;

-- ------------------------------------------------------------------- units:
create or replace function public.unit_move(p_unit text, p_to text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_role text := public.current_staff_role(); v_from text; v_item text;
begin
  if v_role not in ('owner','manager','technician') then raise exception 'move requires technician, manager, or owner'; end if;
  select location, item_id into v_from, v_item from inventory_units
   where id = p_unit and status = 'in_stock' and shop_id = public.current_shop();   -- 5j
  if v_item is null then raise exception 'unit not found or not in stock'; end if;
  if v_from = p_to then raise exception 'from and to are the same location'; end if;
  update inventory_units set location = p_to, updated_at = now()
   where id = p_unit and shop_id = public.current_shop();             -- 5j
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'unit_move', 'inventory_units', p_unit, jsonb_build_object('item', v_item, 'from', v_from, 'to', p_to));
end $function$;

create or replace function public.unit_set_status(p_unit text, p_status text, p_reason text default ''::text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_role text := public.current_staff_role(); v_old text; v_item text;
begin
  if not public.is_manager() then raise exception 'changing a unit''s status requires manager or owner'; end if;
  if p_status not in ('in_stock','sold','warranty_out','failed','lost','written_off') then raise exception 'invalid status'; end if;
  select status, item_id into v_old, v_item from inventory_units
   where id = p_unit and shop_id = public.current_shop();             -- 5j
  if v_item is null then raise exception 'unit not found'; end if;
  update inventory_units set status = p_status, disposition = coalesce(nullif(p_reason,''), disposition), updated_at = now()
   where id = p_unit and shop_id = public.current_shop();             -- 5j
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'unit_status', 'inventory_units', p_unit, jsonb_build_object('item', v_item, 'old', v_old, 'new', p_status, 'reason', p_reason));
end $function$;

create or replace function public.unit_receive(p_item text, p_location text default 'shop'::text, p_qty integer default 1, p_supplier text default ''::text, p_batch text default ''::text, p_unit_cost_cents integer default null::integer)
returns setof text language plpgsql security definer set search_path to 'public' as $function$
declare v_role text := public.current_staff_role(); v_id text; i int; v_cost int;
begin
  if v_role not in ('owner','manager','front_desk') then raise exception 'receive requires front desk, manager, or owner'; end if;
  if p_qty <= 0 then raise exception 'qty must be positive'; end if;
  if not exists (select 1 from inventory where id = p_item and shop_id = public.current_shop()) then
    raise exception 'item not found in your shop';                    -- 5j
  end if;
  perform public.unit_ensure_serialized(p_item);
  v_cost := coalesce(p_unit_cost_cents, (select round(coalesce(cost,0)*100)::int from inventory
                                          where id=p_item and shop_id = public.current_shop()));   -- 5j
  for i in 1..p_qty loop
    insert into inventory_units(item_id, location, supplier, batch, unit_cost_cents, shop_id, created_by)
      values (p_item, coalesce(nullif(p_location,''),'shop'), coalesce(p_supplier,''), coalesce(p_batch,''), v_cost, public.current_shop(), auth.uid())
      returning id into v_id;
    return next v_id;
  end loop;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'unit_receive', 'inventory_units', p_item,
            jsonb_build_object('location', coalesce(nullif(p_location,''),'shop'), 'qty', p_qty, 'supplier', p_supplier, 'batch', p_batch));
end $function$;

-- ------------------------------------------------------------------- cycles:
create or replace function public.cycle_save_line(p_count uuid, p_item text, p_location text, p_counted integer, p_reason text default null::text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_role text := public.current_staff_role(); v_assigned uuid; v_status text; v_exp int; v_delta int;
begin
  if v_role is null then raise exception 'not staff'; end if;
  select assigned_to, status into v_assigned, v_status from cycle_counts
   where id = p_count and shop_id = public.current_shop();            -- 5j
  if v_status is null then raise exception 'count not found'; end if;
  if v_status <> 'open' then raise exception 'this count is % — cannot edit', v_status; end if;
  if not public.is_manager() and (v_assigned is null or v_assigned <> auth.uid()) then
    raise exception 'you are not assigned to this count'; end if;
  v_exp := public.inv_on_hand(p_item, p_location);
  v_delta := coalesce(p_counted,0) - v_exp;
  if v_delta <> 0 and not public.is_manager() and coalesce(nullif(p_reason,''),'') = '' then
    raise exception 'a discrepancy reason is required'; end if;
  insert into public.cycle_count_lines(count_id, item_id, location, expected_qty, counted_qty, delta, reason, shop_id)
    values (p_count, p_item, coalesce(nullif(p_location,''),'shop'), v_exp, p_counted, v_delta, nullif(p_reason,''), public.current_shop())
  on conflict (count_id, item_id, location) do update
    set counted_qty = excluded.counted_qty, expected_qty = excluded.expected_qty, delta = excluded.delta,
        reason = excluded.reason, updated_at = now();
end $function$;

create or replace function public.cycle_complete(p_count uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_status text; r record; v_lines int := 0; v_adj int := 0; v_net int := 0;
begin
  if not public.is_manager() then raise exception 'only a manager or owner can complete a count'; end if;
  select status into v_status from cycle_counts
   where id = p_count and shop_id = public.current_shop();            -- 5j
  if v_status is null then raise exception 'count not found'; end if;
  if v_status <> 'open' then raise exception 'count already %', v_status; end if;
  for r in select * from cycle_count_lines where count_id = p_count and counted_qty is not null
             and shop_id = public.current_shop() loop                 -- 5j
    v_lines := v_lines + 1;
    if coalesce(r.delta,0) <> 0 then
      perform public.inv_adjust(r.item_id, r.location, r.counted_qty, coalesce(r.reason,'miscount'));
      update cycle_count_lines set applied = true, updated_at = now() where id = r.id;
      v_adj := v_adj + 1; v_net := v_net + r.delta;
    end if;
  end loop;
  update cycle_counts set status='completed', completed_at=now()
   where id = p_count and shop_id = public.current_shop();            -- 5j
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), public.current_staff_role(), 'cycle_complete', 'cycle_counts', p_count::text,
            jsonb_build_object('lines', v_lines, 'adjusted', v_adj, 'net_delta', v_net));
  return jsonb_build_object('lines', v_lines, 'adjusted', v_adj, 'net_delta', v_net);
end $function$;

create or replace function public.cycle_cancel(p_count uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.is_manager() then raise exception 'only a manager or owner can cancel a count'; end if;
  update cycle_counts set status='canceled'
   where id = p_count and status='open' and shop_id = public.current_shop();   -- 5j
end $function$;

-- --------------------------------------------------------- warranty/returns:
create or replace function public.warranty_replace(p_original_receipt text, p_item text, p_location text default 'shop'::text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_role text := public.current_staff_role(); v_rdata jsonb; v_created timestamptz;
        v_months int; v_sold_date date; v_has_item boolean; v_cust uuid;
        v_orig_unit text; v_supplier text; v_repl text; v_ret uuid;
begin
  if v_role is null then raise exception 'not staff'; end if;
  select data, created_at into v_rdata, v_created from receipts
   where id = p_original_receipt and deleted_at is null
     and shop_id = public.current_shop();                             -- 5j
  if v_rdata is null then raise exception 'original sale not found'; end if;
  select exists(select 1 from jsonb_array_elements(coalesce(v_rdata->'items','[]'::jsonb)) e where e->>'partId' = p_item) into v_has_item;
  if not v_has_item then raise exception 'that item is not on the original sale'; end if;
  v_months := coalesce( nullif(v_rdata->'warranty'->>'months','')::int,
                        (select nullif(data->'warranty'->>'months','')::int from shop_config
                          where shop_id = public.current_shop()), 6); -- 5j (was id=1)
  v_sold_date := coalesce( nullif(v_rdata->>'date','')::date, v_created::date );
  if current_date > (v_sold_date + (v_months || ' months')::interval)::date then
    raise exception 'warranty expired (sold % · % month warranty)', v_sold_date, v_months; end if;
  v_cust := case when (v_rdata->>'customerId') ~ '^[0-9a-fA-F-]{36}$' then (v_rdata->>'customerId')::uuid else null end;
  select id, supplier into v_orig_unit, v_supplier from inventory_units
    where sold_receipt_id = p_original_receipt and item_id = p_item
      and shop_id = public.current_shop() limit 1;                    -- 5j
  v_supplier := coalesce(v_supplier, (select supplier from inventory where id = p_item
                                        and shop_id = public.current_shop()), '');   -- 5j
  select id into v_repl from inventory_units
    where item_id = p_item and location = p_location and status = 'in_stock'
      and shop_id = public.current_shop()                             -- 5j
    order by acquired_at limit 1;
  if v_repl is null then raise exception 'no stock of that item at % to issue a warranty replacement', p_location; end if;
  update inventory_units set status='warranty_out', disposition='warranty',
         sold_customer_id = v_cust, sold_receipt_id = p_original_receipt, sold_at = now(), updated_at = now()
   where id = v_repl;
  if v_orig_unit is not null then
    update inventory_units set disposition = 'warranty_returned', updated_at = now() where id = v_orig_unit;
  end if;
  insert into supplier_returns(type, unit_id, item_id, supplier, customer_id, original_receipt_id, shop_id, created_by, note)
    values ('warranty', v_orig_unit, p_item, v_supplier, v_cust, p_original_receipt, public.current_shop(), auth.uid(),
            'Warranty replacement issued from '||p_location) returning id into v_ret;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'warranty_replace', 'inventory_units', v_repl,
            jsonb_build_object('item', p_item, 'from', p_location, 'original_receipt', p_original_receipt, 'return_id', v_ret));
  return jsonb_build_object('replacement_unit', v_repl, 'return_id', v_ret, 'supplier', v_supplier, 'original_unit', v_orig_unit);
end $function$;

create or replace function public.key_failed(p_item text, p_location text default 'shop'::text, p_reason text default ''::text, p_unit text default null::text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_role text := public.current_staff_role(); v_unit text; v_supplier text; v_ret uuid;
begin
  if v_role is null then raise exception 'not staff'; end if;
  if p_unit is not null then
    select id, supplier into v_unit, v_supplier from inventory_units
     where id=p_unit and status='in_stock' and shop_id = public.current_shop();   -- 5j
  else
    select id, supplier into v_unit, v_supplier from inventory_units
      where item_id=p_item and location=p_location and status='in_stock'
        and shop_id = public.current_shop()                           -- 5j
      order by acquired_at limit 1;
  end if;
  if v_unit is null then raise exception 'no in-stock unit of that item at % to mark failed', p_location; end if;
  v_supplier := coalesce(v_supplier, (select supplier from inventory where id=p_item
                                        and shop_id = public.current_shop()), '');   -- 5j
  update inventory_units set status='failed', disposition=coalesce(nullif(p_reason,''),'failed'), updated_at=now()
   where id=v_unit and shop_id = public.current_shop();               -- 5j
  insert into supplier_returns(type, unit_id, item_id, supplier, shop_id, created_by, note)
    values ('failed', v_unit, p_item, v_supplier, public.current_shop(), auth.uid(), coalesce(nullif(p_reason,''),'failed')) returning id into v_ret;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'key_failed', 'inventory_units', v_unit, jsonb_build_object('item', p_item, 'location', p_location, 'reason', p_reason, 'return_id', v_ret));
  return jsonb_build_object('failed_unit', v_unit, 'return_id', v_ret, 'supplier', v_supplier);
end $function$;

create or replace function public.return_update(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.is_manager() then raise exception 'only a manager or owner can update supplier returns'; end if;
  if p_status not in ('needs_return','sent','credited','replacement_received') then raise exception 'invalid status'; end if;
  if not exists (select 1 from supplier_returns where id = p_id and shop_id = public.current_shop()) then
    raise exception 'return not found in your shop';                  -- 5j
  end if;
  update supplier_returns
     set status = p_status,
         sent_at = case when p_status='sent' then now() else sent_at end,
         resolved_at = case when p_status in ('credited','replacement_received') then now() else resolved_at end,
         updated_at = now()
   where id = p_id and shop_id = public.current_shop();               -- 5j
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), public.current_staff_role(), 'return_update', 'supplier_returns', p_id::text, jsonb_build_object('status', p_status));
end $function$;
