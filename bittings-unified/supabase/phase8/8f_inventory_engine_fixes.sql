-- ============================================================================
-- Phase 8f — inventory-engine fixes from the 2026-11-07 deep review (C7)
-- ----------------------------------------------------------------------------
-- 1) inv_receive ignored serialized items: it bumped inventory_locations.qty with no units, so the
--    next fn_units_rollup reset the qty to the unit count and the received stock "vanished".
--    → serialized items are received as units (unit_receive).
-- 2) Imported / client-inserted parts carried qty on inventory.qty only — no inventory_locations row —
--    so per-location on-hand read 0 and the first location event wiped the qty.
--    → AFTER INSERT trigger seeds the 'shop' location from qty (non-serialized).
-- 3) warranty_replace could be repeated for the same sale+item, and its "original unit" lookup could
--    pick the previous REPLACEMENT (it is stamped with the same sold_receipt_id).
--    → lookup requires status='sold'; a second replacement for the same sale+item needs a manager.
-- 4) cycle_complete applied the counted number as an ABSOLUTE set, undoing any sale/move between the
--    count and Finish, and had no row lock (two managers could both pass the 'open' check).
--    → applies the counted DIFFERENCE to the current on-hand, under FOR UPDATE.
-- 5) Move-request approval was two client calls (inv_move, then flip status): if the flip failed the
--    request stayed pending and the next Approve moved the stock AGAIN; decided_by was never set.
--    → move_request_approve / move_request_deny: status flip + move in ONE transaction.
-- Everything else in the rewritten functions is identical to the live 5j definitions.
-- Apply: supabase db query --file … --linked --yes
-- ============================================================================

-- 1) inv_receive — serialized-aware ------------------------------------------------------
create or replace function public.inv_receive(p_item text, p_qty integer)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_ser boolean;
begin
  if public.current_staff_role() not in ('owner','manager','front_desk') then raise exception 'receive requires front desk, manager, or owner'; end if;
  if p_qty <= 0 then raise exception 'qty must be positive'; end if;
  select coalesce(serialized,false) into v_ser from inventory where id = p_item and shop_id = public.current_shop();
  if not found then raise exception 'item not found in your shop'; end if;
  if v_ser then
    -- 8f: serialized stock is units — never a bare qty bump (fn_units_rollup owns the location qty)
    perform public.unit_receive(p_item, 'shop', p_qty, '', '', null);
    return;
  end if;
  insert into inventory_locations(item_id, location, qty) values (p_item, 'shop', p_qty)
    on conflict (item_id, location) do update set qty = inventory_locations.qty + excluded.qty, updated_at = now();
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), public.current_staff_role(), 'inventory_receive', 'inventory', p_item,
            jsonb_build_object('location', 'shop', 'qty', p_qty));
end $function$;

-- 2) seed the shop location when a part is inserted with a qty ------------------------------
create or replace function public.fn_inventory_seed_location()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if coalesce(new.qty,0) > 0 and not coalesce(new.serialized,false)
     and not exists (select 1 from inventory_locations where item_id = new.id) then
    insert into inventory_locations(item_id, location, qty, shop_id) values (new.id, 'shop', new.qty, new.shop_id);
  end if;
  return null;
end $function$;
revoke execute on function public.fn_inventory_seed_location() from public, anon, authenticated;
drop trigger if exists trg_inventory_seed_location on public.inventory;
create trigger trg_inventory_seed_location after insert on public.inventory
  for each row execute function public.fn_inventory_seed_location();

-- 3) warranty_replace — original must be a SOLD unit; repeat needs a manager --------------
create or replace function public.warranty_replace(p_original_receipt text, p_item text, p_location text default 'shop'::text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_role text := public.current_staff_role(); v_rdata jsonb; v_created timestamptz;
        v_months int; v_sold_date date; v_has_item boolean; v_cust uuid;
        v_orig_unit text; v_supplier text; v_repl text; v_ret uuid;
begin
  if v_role is null then raise exception 'not staff'; end if;
  select data, created_at into v_rdata, v_created from receipts
   where id = p_original_receipt and deleted_at is null
     and shop_id = public.current_shop();
  if v_rdata is null then raise exception 'original sale not found'; end if;
  select exists(select 1 from jsonb_array_elements(coalesce(v_rdata->'items','[]'::jsonb)) e where e->>'partId' = p_item) into v_has_item;
  if not v_has_item then raise exception 'that item is not on the original sale'; end if;
  -- 8f: one warranty replacement per sale+item unless a manager issues another
  if exists (select 1 from supplier_returns
              where original_receipt_id = p_original_receipt and item_id = p_item and type = 'warranty'
                and shop_id = public.current_shop())
     and not public.is_manager() then
    raise exception 'this item was already replaced under warranty for that sale — a manager can issue another';
  end if;
  v_months := coalesce( nullif(v_rdata->'warranty'->>'months','')::int,
                        (select nullif(data->'warranty'->>'months','')::int from shop_config
                          where shop_id = public.current_shop()), 6);
  v_sold_date := coalesce( nullif(v_rdata->>'date','')::date, v_created::date );
  if current_date > (v_sold_date + (v_months || ' months')::interval)::date then
    raise exception 'warranty expired (sold % · % month warranty)', v_sold_date, v_months; end if;
  v_cust := case when (v_rdata->>'customerId') ~ '^[0-9a-fA-F-]{36}$' then (v_rdata->>'customerId')::uuid else null end;
  -- 8f: the ORIGINAL is the unit still marked sold on that receipt (never a previous warranty replacement)
  select id, supplier into v_orig_unit, v_supplier from inventory_units
    where sold_receipt_id = p_original_receipt and item_id = p_item and status = 'sold'
      and coalesce(disposition,'') <> 'warranty_returned'
      and shop_id = public.current_shop()
    order by sold_at nulls last limit 1;
  v_supplier := coalesce(v_supplier, (select supplier from inventory where id = p_item
                                        and shop_id = public.current_shop()), '');
  select id into v_repl from inventory_units
    where item_id = p_item and location = p_location and status = 'in_stock'
      and shop_id = public.current_shop()
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

-- 4) cycle_complete — relative apply under a row lock -----------------------------------------
create or replace function public.cycle_complete(p_count uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_status text; r record; v_lines int := 0; v_adj int := 0; v_net int := 0; v_cur int; v_new int; v_ser boolean;
begin
  if not public.is_manager() then raise exception 'only a manager or owner can complete a count'; end if;
  select status into v_status from cycle_counts
   where id = p_count and shop_id = public.current_shop() for update;      -- 8f: serialize two managers
  if v_status is null then raise exception 'count not found'; end if;
  if v_status <> 'open' then raise exception 'count already %', v_status; end if;
  for r in select * from cycle_count_lines where count_id = p_count and counted_qty is not null
             and shop_id = public.current_shop() loop
    v_lines := v_lines + 1;
    if coalesce(r.delta,0) <> 0 then
      -- 8f: apply the counted DIFFERENCE to what is on hand NOW (sales/moves since the count survive)
      select coalesce(serialized,false) into v_ser from inventory where id = r.item_id and shop_id = public.current_shop();
      if coalesce(v_ser,false) then
        select count(*) into v_cur from inventory_units where item_id = r.item_id and location = r.location and status = 'in_stock' and shop_id = public.current_shop();
      else
        select coalesce(qty,0) into v_cur from inventory_locations where item_id = r.item_id and location = r.location and shop_id = public.current_shop();
      end if;
      v_new := greatest(0, coalesce(v_cur,0) + r.delta);
      perform public.inv_adjust(r.item_id, r.location, v_new, coalesce(r.reason,'miscount'));
      update cycle_count_lines set applied = true, updated_at = now() where id = r.id;
      v_adj := v_adj + 1; v_net := v_net + r.delta;
    end if;
  end loop;
  update cycle_counts set status='completed', completed_at=now()
   where id = p_count and shop_id = public.current_shop();
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), public.current_staff_role(), 'cycle_complete', 'cycle_counts', p_count::text,
            jsonb_build_object('lines', v_lines, 'adjusted', v_adj, 'net_delta', v_net));
  return jsonb_build_object('lines', v_lines, 'adjusted', v_adj, 'net_delta', v_net);
end $function$;

-- 5) move requests — decide + move atomically ------------------------------------------------
create or replace function public.move_request_approve(p_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare r record;
begin
  if not public.is_manager() then raise exception 'only a manager or owner can approve a stock move'; end if;
  update move_requests set status = 'approved', decided_by = auth.uid(), decided_at = now()
   where id = p_id and status = 'pending' and shop_id = public.current_shop()
   returning item_id, from_loc, to_loc, qty into r;
  if r.item_id is null then raise exception 'that request was already decided (or is not yours)'; end if;
  perform public.inv_move(r.item_id, r.from_loc, r.to_loc, r.qty);   -- a failed move rolls the approval back
  return jsonb_build_object('ok', true, 'item', r.item_id, 'from', r.from_loc, 'to', r.to_loc, 'qty', r.qty);
end $function$;
revoke execute on function public.move_request_approve(uuid) from public, anon;
grant  execute on function public.move_request_approve(uuid) to authenticated;

create or replace function public.move_request_deny(p_id uuid)
returns boolean language plpgsql security definer set search_path to 'public' as $function$
declare v_n int;
begin
  if not public.is_manager() then raise exception 'only a manager or owner can decide a stock move'; end if;
  update move_requests set status = 'denied', decided_by = auth.uid(), decided_at = now()
   where id = p_id and status = 'pending' and shop_id = public.current_shop();
  get diagnostics v_n = row_count;
  return v_n > 0;
end $function$;
revoke execute on function public.move_request_deny(uuid) from public, anon;
grant  execute on function public.move_request_deny(uuid) to authenticated;
