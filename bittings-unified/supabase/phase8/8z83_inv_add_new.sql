-- 8z83 (owner, 2026-11-12): "How can Jayden receive inventory and add keys we don't have in the system yet?"
--
-- Receiving stock of a part that already exists has been open to technicians since 8z9 (inv_receive). Creating a NEW part
-- was manager / owner only (the insert rule on inventory), so a technician unpacking a delivery with a key the system
-- has never seen could do nothing with it.
--
-- inv_add_new lets any staff member create the part and book in how many arrived, in one step:
--   * a technician / front desk fills in what the key IS (name, SKU, category, what it fits, FCC ID, chip, supplier…)
--     and the quantity. Cost and selling price stay empty — they are the owner's / a manager's to set, exactly as on
--     existing parts (8z17). The app flags a part with no price so it gets one.
--   * a manager / owner calling it may set cost and price too.
--   * the same SKU cannot be added twice (the mistake to avoid: a second copy of a key instead of receiving more of it).
-- The opening quantity lands at the shop through the existing trigger (fn_inventory_seed_location).

create or replace function public.inv_add_new(p_part jsonb, p_qty integer default 0)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_role text := public.current_staff_role();
  v_shop uuid := public.current_shop();
  v_mgr boolean := public.current_staff_role() in ('owner', 'manager');
  v_name text := left(trim(coalesce(p_part->>'name', '')), 200);
  v_sku text := left(trim(coalesce(p_part->>'sku', '')), 80);
  v_qty int := greatest(coalesce(p_qty, 0), 0);
  v_id text; v_dup record; v_cost numeric := null; v_price int := null;
begin
  if v_role is null or v_role not in ('owner', 'manager', 'front_desk', 'technician') then raise exception 'not staff'; end if;
  if v_name = '' then raise exception 'Give the part a name.'; end if;
  if v_qty > 100000 then raise exception 'That quantity is too large.'; end if;
  if v_sku <> '' then
    select id, name into v_dup from inventory where shop_id = v_shop and deleted_at is null and lower(trim(sku)) = lower(v_sku) limit 1;
    if found then raise exception 'SKU % is already in stock as "%". Open that one and use Receive instead of adding it again.', v_sku, v_dup.name; end if;
  end if;
  if v_mgr then
    if coalesce(p_part->>'cost', '') ~ '^[0-9]+(\.[0-9]+)?$' then v_cost := (p_part->>'cost')::numeric; end if;
    if coalesce(p_part->>'sell_price_cents', '') ~ '^[0-9]+$' then v_price := (p_part->>'sell_price_cents')::int; end if;
  end if;
  v_id := 'new_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  insert into inventory(id, shop_id, name, sku, category, qty, fitment, fcc_id, chip, grade, brand, vendor_sku, supplier, location, notes, link, cost, sell_price_cents)
  values (v_id, v_shop, v_name, v_sku,
          left(trim(coalesce(p_part->>'category', '')), 80), v_qty,
          left(trim(coalesce(p_part->>'fitment', '')), 4000), upper(left(trim(coalesce(p_part->>'fcc_id', '')), 60)), left(trim(coalesce(p_part->>'chip', '')), 80),
          left(trim(coalesce(p_part->>'grade', '')), 40), left(trim(coalesce(p_part->>'brand', '')), 60), left(trim(coalesce(p_part->>'vendor_sku', '')), 80),
          left(trim(coalesce(p_part->>'supplier', '')), 80), left(trim(coalesce(p_part->>'location', '')), 80), left(trim(coalesce(p_part->>'notes', '')), 2000),
          nullif(left(trim(coalesce(p_part->>'link', '')), 500), ''), v_cost, v_price);
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (auth.uid(), v_role, 'inventory_add', 'inventory', v_id, jsonb_build_object('name', v_name, 'sku', v_sku, 'qty', v_qty, 'priced', v_price is not null), v_shop);
  return jsonb_build_object('id', v_id, 'name', v_name, 'qty', v_qty, 'needs_price', v_price is null);
end $function$;

revoke all on function public.inv_add_new(jsonb, integer) from public, anon;
grant execute on function public.inv_add_new(jsonb, integer) to authenticated;

notify pgrst, 'reload schema';
