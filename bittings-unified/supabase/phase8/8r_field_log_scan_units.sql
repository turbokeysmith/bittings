-- ============================================================================
-- 8r — running field log + scanned units on a sale + scan-back-in (2026-11-08)
-- ----------------------------------------------------------------------------
-- Owner: techs get the dispatched job; on the invoice they may ADD lines but not
-- remove dispatched ones ("Didn't do this" + reason instead), everything lands in
-- a running log; keys are scanned OUT with the phone camera when sold and scanned
-- BACK IN when a customer declines.
--
--   • log_activity(action, entity_type, entity_id, detail)  — any active staff member
--     writes a row to audit_log (stamped user / role / shop). The client has no table
--     grant on audit_log, so this is the one door for app-side events.
--   • pos_decrement_stock — when a receipt line carries `unitIds` (keys the tech
--     scanned), THOSE units are marked sold first; any remainder still goes FIFO.
--   • unit_return_to_stock(unit, location, reason) — technician+ : a unit that was
--     sold on one of this shop's receipts goes back to in_stock at the given location
--     (the tech's van), sale fields cleared, logged. Used by "scan it back in".
-- Rollback: drop function log_activity, unit_return_to_stock; restore pos_decrement_stock
--           from 8l_rollback_original_rpcs.sql (then re-add the 8l require_tier line).
-- ============================================================================

create or replace function public.log_activity(p_action text, p_entity_type text default '', p_entity_id text default '', p_detail jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_role text := public.current_staff_role();
begin
  if v_role is null then raise exception 'not staff'; end if;
  if coalesce(p_action,'') = '' then raise exception 'action required'; end if;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, left(p_action, 64), left(coalesce(p_entity_type,''), 64), left(coalesce(p_entity_id,''), 128), coalesce(p_detail, '{}'::jsonb));
end $$;
revoke all on function public.log_activity(text, text, text, jsonb) from public;
grant execute on function public.log_activity(text, text, text, jsonb) to authenticated;

create or replace function public.unit_return_to_stock(p_unit text, p_location text default 'shop', p_reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare v_role text := public.current_staff_role(); v_item text; v_status text; v_receipt text;
begin
  perform public.require_tier('inventory');
  if v_role not in ('owner','manager','technician','front_desk') then raise exception 'not staff'; end if;
  select item_id, status, sold_receipt_id into v_item, v_status, v_receipt
    from inventory_units where id = p_unit and shop_id = public.current_shop();
  if v_item is null then raise exception 'unit not found'; end if;
  if v_status = 'in_stock' then return; end if;                 -- already back; idempotent
  if v_status <> 'sold' then raise exception 'only a sold unit can be scanned back in (this one is %)', v_status; end if;
  update inventory_units
     set status = 'in_stock', location = coalesce(nullif(p_location,''), location),
         sold_receipt_id = null, sold_customer_id = null, sold_at = null,
         disposition = coalesce(nullif(p_reason,''), disposition), updated_at = now()
   where id = p_unit and shop_id = public.current_shop();
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'unit_returned', 'inventory_units', p_unit,
            jsonb_build_object('item', v_item, 'from_receipt', v_receipt, 'location', p_location, 'reason', p_reason));
end $$;
revoke all on function public.unit_return_to_stock(text, text, text) from public;
grant execute on function public.unit_return_to_stock(text, text, text) to authenticated;

-- pos_decrement_stock: honour scanned unitIds on a line, FIFO for the rest
CREATE OR REPLACE FUNCTION public.pos_decrement_stock(p_receipt text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_data jsonb; v_loc text; v_item jsonb; v_id text; v_qty int; v_ser boolean; v_cust uuid; v_scanned int;
begin
  perform public.require_tier('pos');  -- 8l: plan check (server-enforced)
  if public.current_staff_role() is null then raise exception 'not staff'; end if;
  select data into v_data from receipts
   where id = p_receipt and shop_id = public.current_shop();
  if v_data is null then raise exception 'receipt not found'; end if;
  if coalesce((v_data->>'posStockApplied')::boolean, false) then return; end if;
  v_loc := coalesce(nullif(v_data->>'posLocation',''),'shop');
  v_cust := case when (v_data->>'customerId') ~ '^[0-9a-fA-F-]{36}$' then (v_data->>'customerId')::uuid else null end;
  for v_item in select value from jsonb_array_elements(coalesce(v_data->'items','[]'::jsonb)) loop
    if nullif(v_item->>'partId','') is null then continue; end if;
    if coalesce((v_item->>'declined')::boolean, false) then continue; end if;   -- 8r: "didn't do this" lines never pull stock
    v_id := v_item->>'partId'; v_qty := coalesce((v_item->>'qty')::int, 1);
    select coalesce(serialized,false) into v_ser from inventory
     where id = v_id and shop_id = public.current_shop();
    if not found then continue; end if;
    if v_ser then
      -- 8r: units the tech scanned for this line go first (any location they are in stock at)
      v_scanned := 0;
      if jsonb_typeof(v_item->'unitIds') = 'array' then
        with picked as (
          update inventory_units set status='sold', sold_receipt_id=p_receipt, sold_customer_id=v_cust, sold_at=now(), updated_at=now()
           where shop_id = public.current_shop() and item_id = v_id and status = 'in_stock'
             and id in (select jsonb_array_elements_text(v_item->'unitIds'))
          returning 1)
        select count(*) into v_scanned from picked;
      end if;
      if v_qty - v_scanned > 0 then
        update inventory_units set status='sold', sold_receipt_id=p_receipt, sold_customer_id=v_cust, sold_at=now(), updated_at=now()
          where id in (select id from inventory_units where item_id=v_id and location=v_loc and status='in_stock'
                         and shop_id = public.current_shop()
                       order by acquired_at limit (v_qty - v_scanned));
      end if;
    else
      insert into inventory_locations(item_id, location, qty) values (v_id, v_loc, 0) on conflict (item_id, location) do nothing;
      update inventory_locations set qty = greatest(0, coalesce(qty,0) - v_qty), updated_at=now()
       where item_id=v_id and location=v_loc and shop_id = public.current_shop();
    end if;
    insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
      values (auth.uid(), public.current_staff_role(), 'pos_sold', 'inventory', v_id, jsonb_build_object('location', v_loc, 'qty', v_qty, 'receipt', p_receipt, 'serialized', v_ser, 'scanned', v_scanned));
  end loop;
  update receipts set data = jsonb_set(data, '{posStockApplied}', 'true'::jsonb), updated_at=now()
   where id = p_receipt and shop_id = public.current_shop();
end $function$;
