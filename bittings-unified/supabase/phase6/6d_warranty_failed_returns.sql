-- ============================================================================
-- Phase 6 · 6d — warranty replacement + failed key + return-to-supplier tracking
-- • warranty_replace (all staff): a SOLD key failed within warranty → verify off the
--   original sale (receipt contains the item + within warranty months), issue a
--   replacement from the issuing location as WARRANTY (not a sale), log the defective
--   key on the supplier-return list (type=warranty, supplier-tagged, customer-linked).
-- • key_failed (all staff): a key that never reached a customer (bench/programming
--   failure) → remove from stock, log for supplier return (type=failed, no customer).
-- • return_update (manager+): needs_return → sent → credited | replacement_received.
-- Applied live via mcp apply_migration (phase6_6d_warranty_failed_returns), 2026-07-01.
-- ============================================================================

create table if not exists public.supplier_returns (
  id                  uuid primary key default gen_random_uuid(),
  shop_id             uuid not null default public.current_shop(),
  type                text not null check (type in ('warranty','failed')),
  unit_id             text references public.inventory_units(id),
  item_id             text not null,
  supplier            text default '',
  customer_id         uuid,
  original_receipt_id text,
  status              text not null default 'needs_return'
                        check (status in ('needs_return','sent','credited','replacement_received')),
  qty                 integer not null default 1,
  note                text default '',
  created_by          uuid default auth.uid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  sent_at             timestamptz,
  resolved_at         timestamptz
);
create index if not exists sr_status_idx   on public.supplier_returns(status);
create index if not exists sr_supplier_idx on public.supplier_returns(supplier);
create index if not exists sr_type_idx     on public.supplier_returns(type);
alter table public.supplier_returns enable row level security;
grant select on public.supplier_returns to authenticated;
revoke insert, update, delete on public.supplier_returns from authenticated;
grant select, insert, update, delete on public.supplier_returns to service_role;
drop policy if exists sr_select on public.supplier_returns;
create policy sr_select on public.supplier_returns for select to authenticated using (public.is_staff());
drop policy if exists sr_tenant on public.supplier_returns;
create policy sr_tenant on public.supplier_returns as restrictive for all to authenticated
  using (shop_id = public.current_shop()) with check (shop_id = public.current_shop());

create or replace function public.warranty_replace(p_original_receipt text, p_item text, p_location text default 'shop')
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_role text := public.current_staff_role(); v_rdata jsonb; v_created timestamptz;
        v_months int; v_sold_date date; v_has_item boolean; v_cust uuid;
        v_orig_unit text; v_supplier text; v_repl text; v_ret uuid;
begin
  if v_role is null then raise exception 'not staff'; end if;
  select data, created_at into v_rdata, v_created from receipts where id = p_original_receipt and deleted_at is null;
  if v_rdata is null then raise exception 'original sale not found'; end if;
  select exists(select 1 from jsonb_array_elements(coalesce(v_rdata->'items','[]'::jsonb)) e where e->>'partId' = p_item) into v_has_item;
  if not v_has_item then raise exception 'that item is not on the original sale'; end if;
  v_months := coalesce( nullif(v_rdata->'warranty'->>'months','')::int,
                        (select nullif(data->'warranty'->>'months','')::int from shop_config where id=1), 6);
  v_sold_date := coalesce( nullif(v_rdata->>'date','')::date, v_created::date );
  if current_date > (v_sold_date + (v_months || ' months')::interval)::date then
    raise exception 'warranty expired (sold % · % month warranty)', v_sold_date, v_months; end if;
  v_cust := case when (v_rdata->>'customerId') ~ '^[0-9a-fA-F-]{36}$' then (v_rdata->>'customerId')::uuid else null end;
  select id, supplier into v_orig_unit, v_supplier from inventory_units
    where sold_receipt_id = p_original_receipt and item_id = p_item limit 1;
  v_supplier := coalesce(v_supplier, (select supplier from inventory where id = p_item), '');
  select id into v_repl from inventory_units
    where item_id = p_item and location = p_location and status = 'in_stock' order by acquired_at limit 1;
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
end $$;

create or replace function public.key_failed(p_item text, p_location text default 'shop', p_reason text default '', p_unit text default null)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_role text := public.current_staff_role(); v_unit text; v_supplier text; v_ret uuid;
begin
  if v_role is null then raise exception 'not staff'; end if;
  if p_unit is not null then
    select id, supplier into v_unit, v_supplier from inventory_units where id=p_unit and status='in_stock';
  else
    select id, supplier into v_unit, v_supplier from inventory_units
      where item_id=p_item and location=p_location and status='in_stock' order by acquired_at limit 1;
  end if;
  if v_unit is null then raise exception 'no in-stock unit of that item at % to mark failed', p_location; end if;
  v_supplier := coalesce(v_supplier, (select supplier from inventory where id=p_item), '');
  update inventory_units set status='failed', disposition=coalesce(nullif(p_reason,''),'failed'), updated_at=now() where id=v_unit;
  insert into supplier_returns(type, unit_id, item_id, supplier, shop_id, created_by, note)
    values ('failed', v_unit, p_item, v_supplier, public.current_shop(), auth.uid(), coalesce(nullif(p_reason,''),'failed')) returning id into v_ret;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'key_failed', 'inventory_units', v_unit, jsonb_build_object('item', p_item, 'location', p_location, 'reason', p_reason, 'return_id', v_ret));
  return jsonb_build_object('failed_unit', v_unit, 'return_id', v_ret, 'supplier', v_supplier);
end $$;

create or replace function public.return_update(p_id uuid, p_status text)
  returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_manager() then raise exception 'only a manager or owner can update supplier returns'; end if;
  if p_status not in ('needs_return','sent','credited','replacement_received') then raise exception 'invalid status'; end if;
  update supplier_returns
     set status = p_status,
         sent_at = case when p_status='sent' then now() else sent_at end,
         resolved_at = case when p_status in ('credited','replacement_received') then now() else resolved_at end,
         updated_at = now()
   where id = p_id;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), public.current_staff_role(), 'return_update', 'supplier_returns', p_id::text, jsonb_build_object('status', p_status));
end $$;

revoke execute on function public.warranty_replace(text,text,text) from public;
revoke execute on function public.key_failed(text,text,text,text) from public;
revoke execute on function public.return_update(uuid,text) from public;
grant execute on function public.warranty_replace(text,text,text) to authenticated;
grant execute on function public.key_failed(text,text,text,text) to authenticated;
grant execute on function public.return_update(uuid,text) to authenticated;
