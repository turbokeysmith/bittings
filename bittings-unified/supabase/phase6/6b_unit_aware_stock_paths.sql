-- ============================================================================
-- Phase 6 · 6b — make the existing stock paths unit-aware for SERIALIZED items
-- ----------------------------------------------------------------------------
-- Non-serialized items keep the EXACT original qty behavior (phase1b/2a). For a
-- serialized item, inventory_locations.qty is driven by the units rollup (6a), so
-- these RPCs must act on units instead of writing qty directly:
--   • inv_move   → relocate N oldest in_stock units
--   • inv_adjust → reconcile the in_stock count (down = write off oldest; up = create units)
--   • pos_decrement_stock → mark N oldest in_stock units SOLD + link receipt/customer (traceability)
-- Applied live via mcp apply_migration (phase6_6b_unit_aware_stock_paths), 2026-07-01.
-- ============================================================================

create or replace function public.inv_move(p_item text, p_from text, p_to text, p_qty int)
  returns void language plpgsql security definer set search_path = public as $$
declare v_have int; v_ser boolean;
begin
  if public.current_staff_role() not in ('owner','manager','technician') then raise exception 'move requires technician, manager, or owner'; end if;
  if p_qty <= 0 then raise exception 'qty must be positive'; end if;
  if p_from = p_to then raise exception 'from and to are the same location'; end if;
  select coalesce(serialized,false) into v_ser from inventory where id = p_item;
  if v_ser then
    select count(*) into v_have from inventory_units where item_id=p_item and location=p_from and status='in_stock';
    if coalesce(v_have,0) < p_qty then raise exception 'not enough stock at %', p_from; end if;
    update inventory_units set location=p_to, updated_at=now()
      where id in (select id from inventory_units where item_id=p_item and location=p_from and status='in_stock' order by acquired_at limit p_qty);
  else
    select coalesce(qty,0) into v_have from inventory_locations where item_id = p_item and location = p_from;
    if coalesce(v_have,0) < p_qty then raise exception 'not enough stock at %', p_from; end if;
    update inventory_locations set qty = qty - p_qty, updated_at = now() where item_id = p_item and location = p_from;
    insert into inventory_locations(item_id, location, qty) values (p_item, p_to, p_qty)
      on conflict (item_id, location) do update set qty = inventory_locations.qty + excluded.qty, updated_at = now();
  end if;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), public.current_staff_role(), 'inventory_move', 'inventory', p_item,
            jsonb_build_object('from', p_from, 'to', p_to, 'qty', p_qty, 'serialized', v_ser));
end $$;

create or replace function public.inv_adjust(p_item text, p_loc text, p_new_qty int, p_reason text)
  returns void language plpgsql security definer set search_path = public as $$
declare v_old int; v_ser boolean; v_cost int; i int;
begin
  if not public.is_manager() then raise exception 'adjust/write-off requires manager or owner'; end if;
  if p_new_qty < 0 then raise exception 'qty cannot be negative'; end if;
  select coalesce(serialized,false) into v_ser from inventory where id = p_item;
  if v_ser then
    select count(*) into v_old from inventory_units where item_id=p_item and location=p_loc and status='in_stock';
    if p_new_qty < v_old then
      update inventory_units set status='written_off', disposition=coalesce(nullif(p_reason,''),'adjust'), updated_at=now()
        where id in (select id from inventory_units where item_id=p_item and location=p_loc and status='in_stock' order by acquired_at limit (v_old - p_new_qty));
    elsif p_new_qty > v_old then
      select round(coalesce(cost,0)*100)::int into v_cost from inventory where id=p_item;
      for i in 1..(p_new_qty - v_old) loop
        insert into inventory_units(item_id, location, supplier, batch, unit_cost_cents, disposition, shop_id, created_by)
          values (p_item, p_loc, '(adjustment)', '', v_cost, coalesce(nullif(p_reason,''),'adjust'), public.current_shop(), auth.uid());
      end loop;
    end if;
  else
    select coalesce(qty,0) into v_old from inventory_locations where item_id = p_item and location = p_loc;
    insert into inventory_locations(item_id, location, qty) values (p_item, p_loc, p_new_qty)
      on conflict (item_id, location) do update set qty = excluded.qty, updated_at = now();
  end if;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), public.current_staff_role(), 'inventory_adjust', 'inventory', p_item,
            jsonb_build_object('location', p_loc, 'old', coalesce(v_old,0), 'new', p_new_qty, 'reason', coalesce(p_reason,''), 'serialized', v_ser));
end $$;

create or replace function public.pos_decrement_stock(p_receipt text)
  returns void language plpgsql security definer set search_path = public as $$
declare v_data jsonb; v_loc text; v_item jsonb; v_id text; v_qty int; v_ser boolean; v_cust uuid;
begin
  if public.current_staff_role() is null then raise exception 'not staff'; end if;
  select data into v_data from receipts where id = p_receipt;
  if v_data is null then raise exception 'receipt not found'; end if;
  if coalesce((v_data->>'posStockApplied')::boolean, false) then return; end if;
  v_loc := coalesce(nullif(v_data->>'posLocation',''),'shop');
  v_cust := case when (v_data->>'customerId') ~ '^[0-9a-fA-F-]{36}$' then (v_data->>'customerId')::uuid else null end;
  for v_item in select value from jsonb_array_elements(coalesce(v_data->'items','[]'::jsonb)) loop
    if nullif(v_item->>'partId','') is null then continue; end if;
    v_id := v_item->>'partId'; v_qty := coalesce((v_item->>'qty')::int, 1);
    select coalesce(serialized,false) into v_ser from inventory where id = v_id;
    if v_ser then
      update inventory_units set status='sold', sold_receipt_id=p_receipt, sold_customer_id=v_cust, sold_at=now(), updated_at=now()
        where id in (select id from inventory_units where item_id=v_id and location=v_loc and status='in_stock' order by acquired_at limit v_qty);
    else
      insert into inventory_locations(item_id, location, qty) values (v_id, v_loc, 0) on conflict (item_id, location) do nothing;
      update inventory_locations set qty = greatest(0, coalesce(qty,0) - v_qty), updated_at=now() where item_id=v_id and location=v_loc;
    end if;
    insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
      values (auth.uid(), public.current_staff_role(), 'pos_sold', 'inventory', v_id, jsonb_build_object('location', v_loc, 'qty', v_qty, 'receipt', p_receipt, 'serialized', v_ser));
  end loop;
  update receipts set data = jsonb_set(data, '{posStockApplied}', 'true'::jsonb), updated_at=now() where id = p_receipt;
end $$;
