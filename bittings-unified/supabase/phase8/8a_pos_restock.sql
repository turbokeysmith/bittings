-- ============================================================================
-- Phase 8a — pos_restock: put a sold receipt's parts BACK into stock (refund / void)
-- ----------------------------------------------------------------------------
-- Why: pos_decrement_stock() (2a, unit-aware since 6b, shop-fenced since 5j) is the
-- only server path that takes parts OUT of stock when a sale completes, and it
-- stamps receipts.data.posStockApplied = true. Nothing ever reversed it: the Reports
-- refund button promised "parts will be returned to stock" but only looked at the
-- old client-side `stockApplied` flag and wrote inventory.qty directly (which the
-- location triggers overwrite). This is the exact inverse of pos_decrement_stock:
--   • serialized items → every unit sold on this receipt (status 'sold') goes back
--     to 'in_stock' at the location it still carries; sold_* fields cleared.
--     (Units already warranty-replaced / failed are left alone.)
--   • non-serialized → qty added back at the receipt's posLocation (default 'shop').
--   • audit row 'pos_restocked' per item; flag flipped to false + posStockReversedAt.
-- Idempotent: a receipt whose stock isn't applied returns {restocked:false}.
-- Manager/owner only (same gate as refunds); fenced to current_shop() like 5j.
-- Apply: Supabase SQL editor or `supabase db query --file … --linked --yes`.
-- ============================================================================

create or replace function public.pos_restock(p_receipt text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_data jsonb; v_loc text; v_item jsonb; v_id text; v_qty int; v_ser boolean; v_n int;
  v_out jsonb := '[]'::jsonb;
begin
  if public.current_staff_role() is null then raise exception 'not staff'; end if;
  if not public.is_manager() then raise exception 'only a manager can return stock'; end if;

  select data into v_data from receipts
   where id = p_receipt and shop_id = public.current_shop();
  if v_data is null then raise exception 'receipt not found'; end if;
  if not coalesce((v_data->>'posStockApplied')::boolean, false) then
    return jsonb_build_object('restocked', false, 'reason', 'stock was not applied for this receipt');
  end if;

  v_loc := coalesce(nullif(v_data->>'posLocation',''), 'shop');

  for v_item in select value from jsonb_array_elements(coalesce(v_data->'items','[]'::jsonb)) loop
    if nullif(v_item->>'partId','') is null then continue; end if;
    v_id := v_item->>'partId'; v_qty := greatest(0, coalesce((v_item->>'qty')::int, 1));
    if v_qty = 0 then continue; end if;

    select coalesce(serialized,false) into v_ser from inventory
     where id = v_id and shop_id = public.current_shop();
    if not found then continue; end if;                   -- unknown/foreign item — never touch rows

    if v_ser then
      update inventory_units
         set status = 'in_stock', sold_receipt_id = null, sold_customer_id = null, sold_at = null, updated_at = now()
       where sold_receipt_id = p_receipt and item_id = v_id and status = 'sold'
         and shop_id = public.current_shop();
      get diagnostics v_n = row_count;                   -- fn_units_rollup refreshes inventory_locations
    else
      insert into inventory_locations(item_id, location, qty) values (v_id, v_loc, 0)
        on conflict (item_id, location) do nothing;
      update inventory_locations
         set qty = coalesce(qty,0) + v_qty, updated_at = now()
       where item_id = v_id and location = v_loc and shop_id = public.current_shop();
      v_n := v_qty;                                      -- fn_sync_inv_total refreshes inventory.qty
    end if;

    insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
      values (auth.uid(), public.current_staff_role(), 'pos_restocked', 'inventory', v_id,
              jsonb_build_object('location', v_loc, 'qty', v_n, 'receipt', p_receipt, 'serialized', v_ser));
    v_out := v_out || jsonb_build_object('item', v_id, 'qty', v_n, 'serialized', v_ser);
  end loop;

  update receipts
     set data = data || jsonb_build_object('posStockApplied', false, 'posStockReversedAt', now()),
         updated_at = now()
   where id = p_receipt and shop_id = public.current_shop();

  return jsonb_build_object('restocked', true, 'items', v_out);
end $function$;

revoke execute on function public.pos_restock(text) from public, anon;
grant  execute on function public.pos_restock(text) to authenticated;

comment on function public.pos_restock(text) is
  'Inverse of pos_decrement_stock: returns a receipt''s parts to stock on a full refund/void. Manager-only, shop-fenced, idempotent via receipts.data.posStockApplied.';
