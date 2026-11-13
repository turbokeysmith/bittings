-- 8z115 (owner, 2026-11-13): "we need to make sure those serial numbers get attached to the receipt and to that customer
-- and to that vehicle."
--
-- The link already exists in the data: a sale marks the key (inventory_units) sold and stamps sold_receipt_id (= receipts.id, which for
-- a Register sale is also the receipt number), sold_customer_id and sold_at (pos_decrement_stock, 8l). The vehicle lives on the
-- receipt (receipts.data: vehYear / vehMake / vehModel / vin, extra cars in data.moreVehicles[]). What was missing is SHOWING it.
-- These two functions only READ. Staff only, this shop only. Nothing is written.
--
--   units_for_receipt(p_receipt text)   keys sold on one receipt (matches the receipt id OR its number)
--   units_for_customer(p_customer uuid) keys sold to one customer, newest first, with the receipt and the vehicle
--
-- Rollback: drop function public.units_for_receipt(text); drop function public.units_for_customer(uuid);

create or replace function public.units_for_receipt(p_receipt text)
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select case when public.current_staff_role() is null or public.current_shop() is null or nullif(btrim(p_receipt), '') is null
    then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object('id', u.id, 'serial', u.serial, 'item_id', u.item_id, 'item_name', i.name, 'sku', i.sku,
                                          'status', u.status, 'sold_at', u.sold_at) order by u.sold_at nulls last, u.serial)
        from inventory_units u
        left join inventory i on i.id = u.item_id and i.shop_id = u.shop_id
       where u.shop_id = public.current_shop()
         and u.sold_receipt_id is not null
         and (u.sold_receipt_id = p_receipt
              or u.sold_receipt_id in (select r.id from receipts r
                                        where r.shop_id = public.current_shop() and r.data->>'number' = p_receipt))), '[]'::jsonb) end;
$function$;

-- p_receipts: the receipts the app already shows for this customer (it matches them by name / phone). Most receipts do
-- not carry a customer id, so the keys are found through those receipts as well as through sold_customer_id.
create or replace function public.units_for_customer(p_customer text, p_receipts text[] default null)
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select case when public.current_staff_role() is null or public.current_shop() is null
                   or (nullif(btrim(coalesce(p_customer, '')), '') is null and coalesce(array_length(p_receipts, 1), 0) = 0)
    then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object('id', u.id, 'serial', u.serial, 'item_id', u.item_id, 'item_name', i.name, 'sku', i.sku,
                                          'status', u.status, 'sold_at', u.sold_at,
                                          'receipt_id', u.sold_receipt_id, 'receipt_number', coalesce(r.data->>'number', u.sold_receipt_id),
                                          'vehicle', nullif(btrim(concat_ws(' ', nullif(r.data->>'vehYear',''), nullif(r.data->>'vehMake',''), nullif(r.data->>'vehModel',''))), ''))
                                order by u.sold_at desc nulls last, u.serial)
        from inventory_units u
        left join inventory i on i.id = u.item_id and i.shop_id = u.shop_id
        left join receipts r on r.id = u.sold_receipt_id and r.shop_id = u.shop_id
       where u.shop_id = public.current_shop()
         and u.sold_receipt_id is not null
         and (u.sold_customer_id::text = p_customer or u.sold_receipt_id = any(coalesce(p_receipts, array[]::text[])))), '[]'::jsonb) end;
$function$;

revoke all on function public.units_for_receipt(text)  from public, anon;
revoke all on function public.units_for_customer(text, text[]) from public, anon;
grant execute on function public.units_for_receipt(text)  to authenticated;
grant execute on function public.units_for_customer(text, text[]) to authenticated;
