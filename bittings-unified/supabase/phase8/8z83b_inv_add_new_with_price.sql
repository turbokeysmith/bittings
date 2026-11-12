-- 8z83b (owner, 2026-11-12, an hour after 8z83): "I need him to be able to edit prices and cost when adding keys. I want
-- it as a task like Reconcile that allows him to enter new keys and lets him add prices, cost, website link,
-- manufacturer, all that stuff."
--
-- So whoever adds a NEW item sets its selling price and cost too — technician and front desk included. This is only for
-- the item being created: on items that already exist a technician still cannot change the name, price, cost or
-- quantity (8z17 / inv_update_info), and cost stays hidden from him in the stock list (inventory_safe).
-- Also taken at creation now: the low-stock point and the reorder quantity.

create or replace function public.inv_add_new(p_part jsonb, p_qty integer default 0)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_role text := public.current_staff_role();
  v_shop uuid := public.current_shop();
  v_name text := left(trim(coalesce(p_part->>'name', '')), 200);
  v_sku text := left(trim(coalesce(p_part->>'sku', '')), 80);
  v_qty int := greatest(coalesce(p_qty, 0), 0);
  v_id text; v_dup record; v_cost numeric := null; v_price int := null; v_low int := 0; v_rq int := 0;
begin
  if v_role is null or v_role not in ('owner', 'manager', 'front_desk', 'technician') then raise exception 'not staff'; end if;
  if v_name = '' then raise exception 'Give the part a name.'; end if;
  if v_qty > 100000 then raise exception 'That quantity is too large.'; end if;
  if v_sku <> '' then
    select id, name into v_dup from inventory where shop_id = v_shop and deleted_at is null and lower(trim(sku)) = lower(v_sku) limit 1;
    if found then raise exception 'SKU % is already in stock as "%". Open that one and use Receive instead of adding it again.', v_sku, v_dup.name; end if;
  end if;
  if coalesce(p_part->>'cost', '') ~ '^[0-9]{1,7}(\.[0-9]{1,4})?$' then v_cost := (p_part->>'cost')::numeric; end if;
  if coalesce(p_part->>'sell_price_cents', '') ~ '^[0-9]{1,9}$' then v_price := (p_part->>'sell_price_cents')::int; end if;
  if coalesce(p_part->>'low_at', '') ~ '^[0-9]{1,6}$' then v_low := (p_part->>'low_at')::int; end if;
  if coalesce(p_part->>'reorder_qty', '') ~ '^[0-9]{1,6}$' then v_rq := (p_part->>'reorder_qty')::int; end if;
  v_id := 'new_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  insert into inventory(id, shop_id, name, sku, category, qty, low_at, reorder_qty, fitment, fcc_id, chip, grade, brand, vendor_sku, supplier, location, notes, link, cost, sell_price_cents)
  values (v_id, v_shop, v_name, v_sku,
          left(trim(coalesce(p_part->>'category', '')), 80), v_qty, v_low, v_rq,
          left(trim(coalesce(p_part->>'fitment', '')), 4000), upper(left(trim(coalesce(p_part->>'fcc_id', '')), 60)), left(trim(coalesce(p_part->>'chip', '')), 80),
          left(trim(coalesce(p_part->>'grade', '')), 40), left(trim(coalesce(p_part->>'brand', '')), 60), left(trim(coalesce(p_part->>'vendor_sku', '')), 80),
          left(trim(coalesce(p_part->>'supplier', '')), 80), left(trim(coalesce(p_part->>'location', '')), 80), left(trim(coalesce(p_part->>'notes', '')), 2000),
          nullif(left(trim(coalesce(p_part->>'link', '')), 500), ''), v_cost, v_price);
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (auth.uid(), v_role, 'inventory_add', 'inventory', v_id,
            jsonb_build_object('name', v_name, 'sku', v_sku, 'qty', v_qty, 'price_cents', v_price, 'cost', v_cost), v_shop);
  return jsonb_build_object('id', v_id, 'name', v_name, 'qty', v_qty, 'needs_price', v_price is null);
end $function$;

revoke all on function public.inv_add_new(jsonb, integer) from public, anon;
grant execute on function public.inv_add_new(jsonb, integer) to authenticated;

notify pgrst, 'reload schema';
