-- 8z112 (owner, 2026-11-13): "I want all my stuff serialized so I need it to be automatically serialized. Or a setting
-- in inventory that says serialize everything. This printed out without the serial number."
--
-- Until now an item only became serial-numbered the first time units were RECEIVED for it (unit_receive →
-- unit_ensure_serialized). Nothing in the shop's stock had been, so labels had no serial to print.
--
-- This adds a shop switch:
--   * serialize_all_on()  — owner / manager. Every item of the shop that is not serial-numbered yet becomes so, and every
--                           piece on hand gets its own unit record (supplier "(pre-serialization)", the item's cost), exactly
--                           as unit_ensure_serialized has always done for one item. Quantities do not change: the units
--                           roll-up gives back the same count per location. The switch is then remembered on the shop.
--   * while the switch is on, a NEW item is serial-numbered the moment it is added.
--   * serialize_all_off() — stops doing that for new items. Items already serial-numbered stay that way.
--   * serialize_all_status() — what the Settings screen shows.
-- The stock paths have been unit-aware since phase 6 (sales take the oldest unit, moves / adjust / receive act on units),
-- so day-to-day work does not change.

alter table public.shops add column if not exists serialize_all boolean not null default false;

create or replace function public.serialize_all_status()
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select case when public.current_staff_role() is null then null else jsonb_build_object(
    'on', coalesce((select s.serialize_all from shops s where s.id = public.current_shop()), false),
    'items_left', (select count(*) from inventory i where i.shop_id = public.current_shop() and i.deleted_at is null and coalesce(i.serialized, false) = false),
    'pieces_left', (select coalesce(sum(greatest(coalesce(i.qty, 0), 0)), 0) from inventory i where i.shop_id = public.current_shop() and i.deleted_at is null and coalesce(i.serialized, false) = false),
    'items_done', (select count(*) from inventory i where i.shop_id = public.current_shop() and i.deleted_at is null and coalesce(i.serialized, false) = true)) end;
$function$;

create or replace function public.serialize_all_on()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_shop uuid := public.current_shop(); r record; n_items int := 0; v_before bigint; v_after bigint; v_qty_before numeric; v_qty_after numeric;
begin
  if v_shop is null or not public.is_manager() then raise exception 'only a manager/owner can switch this on'; end if;
  select count(*) into v_before from inventory_units where shop_id = v_shop;
  select coalesce(sum(l.qty), 0) into v_qty_before from inventory_locations l join inventory i on i.id = l.item_id where i.shop_id = v_shop and i.deleted_at is null;
  for r in select i.id, i.qty from inventory i where i.shop_id = v_shop and i.deleted_at is null and coalesce(i.serialized, false) = false order by i.id loop
    -- stock that was never put on a location: it is on the shop shelf
    if coalesce(r.qty, 0) > 0 and not exists (select 1 from inventory_locations l where l.item_id = r.id) then
      insert into inventory_locations(item_id, location, qty, shop_id) values (r.id, 'shop', r.qty, v_shop);
    end if;
    perform public.unit_ensure_serialized(r.id);
    n_items := n_items + 1;
  end loop;
  select count(*) into v_after from inventory_units where shop_id = v_shop;
  select coalesce(sum(l.qty), 0) into v_qty_after from inventory_locations l join inventory i on i.id = l.item_id where i.shop_id = v_shop and i.deleted_at is null;
  if v_qty_after <> v_qty_before then   -- never let this change a count: undo everything
    raise exception 'Stopped: the stock count would have changed (% → %). Nothing was changed.', v_qty_before, v_qty_after using errcode = 'P0001';
  end if;
  update shops set serialize_all = true where id = v_shop;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (auth.uid(), public.current_staff_role(), 'serialize_all_on', 'shops', v_shop::text, jsonb_build_object('items', n_items, 'units_created', v_after - v_before, 'pieces', v_qty_after), v_shop);
  return jsonb_build_object('ok', true, 'items', n_items, 'units_created', v_after - v_before);
end $function$;

create or replace function public.serialize_all_off()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.is_manager() then raise exception 'only a manager/owner can change this'; end if;
  update shops set serialize_all = false where id = public.current_shop();
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (auth.uid(), public.current_staff_role(), 'serialize_all_off', 'shops', public.current_shop()::text, '{}'::jsonb, public.current_shop());
  return jsonb_build_object('ok', true);
end $function$;

-- a new item, while the switch is on (runs after trg_inventory_seed_location — triggers fire in name order)
create or replace function public.fn_inventory_serialize_new()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if coalesce(new.serialized, false) = false
     and coalesce((select s.serialize_all from shops s where s.id = new.shop_id), false) then
    begin
      perform public.unit_ensure_serialized(new.id);
    exception when others then null;   -- never block adding an item (e.g. a plan without this feature)
    end;
  end if;
  return null;
end $function$;
revoke execute on function public.fn_inventory_serialize_new() from public, anon, authenticated;
drop trigger if exists trg_inventory_zz_serialize_new on public.inventory;
create trigger trg_inventory_zz_serialize_new after insert on public.inventory
  for each row execute function public.fn_inventory_serialize_new();

revoke all on function public.serialize_all_status() from public, anon;
revoke all on function public.serialize_all_on() from public, anon;
revoke all on function public.serialize_all_off() from public, anon;
grant execute on function public.serialize_all_status() to authenticated;
grant execute on function public.serialize_all_on() to authenticated;
grant execute on function public.serialize_all_off() to authenticated;
