-- 8z120 (owner, 2026-11-13): "Whenever I move a key to the van, whoever's van it is assigned to needs to scan the key in,
-- so we can make sure they had physical hold of the key as it was being put onto their vehicle. If I assign it to Jayden I
-- scan it out, then he accepts it and scans it in, and then a pop-up box shows up of where it was put on the van."
--
-- A key (one inventory_units row) sent to a van is a HAND-OVER: it stays where it is — and is still counted there — until
-- the technician whose van it is (staff.home_van_id) scans it in. Only then does it move, and the technician records the
-- place on the van (inventory_units.bin, per key). A manager / owner can accept for them or take a hand-over back.
-- Moving a key to the shop is immediate, as before. Everything is written to audit_log.
--
--   unit_send(unit, to)            → van: pending hand-over · shop: moves now
--   unit_accept(unit, bin)         → the van's technician (or a manager): the key is now on the van
--   unit_set_bin(unit, bin)        → where this exact key sits
--   unit_transfer_cancel(unit)     → the sender or a manager takes it back
--   unit_transfers_pending()       → what is waiting for me to scan in / what I sent that is still out

alter table public.inventory_units add column if not exists bin text not null default '';

create table if not exists public.unit_transfers (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null default public.current_shop() references public.shops(id) on delete cascade,
  unit_id       text not null references public.inventory_units(id) on delete cascade,
  item_id       text not null,
  from_loc      text not null,
  to_loc        text not null,
  sent_by       uuid default auth.uid(),
  sent_at       timestamptz not null default now(),
  accepted_by   uuid,
  accepted_at   timestamptz,
  cancelled_by  uuid,
  cancelled_at  timestamptz
);
alter table public.unit_transfers enable row level security;   -- no policies: the functions below are the only way in
revoke all on public.unit_transfers from public, anon, authenticated;
create unique index if not exists unit_transfers_one_open on public.unit_transfers(unit_id) where accepted_at is null and cancelled_at is null;
create index if not exists unit_transfers_shop_open on public.unit_transfers(shop_id) where accepted_at is null and cancelled_at is null;

-- who drives a van (names), and a van's display name
create or replace function public.van_label(p_loc text)
returns text language sql stable security definer set search_path to 'public' as $function$
  select case when p_loc = 'shop' then 'the shop'
              when p_loc like 'van:%' then coalesce((select coalesce(nullif(v.nickname, ''), nullif(v.fleet_no, ''), 'the van') from vans v where v.id::text = substr(p_loc, 5) and v.shop_id = public.current_shop()), 'the van')
              else p_loc end;
$function$;
create or replace function public.van_tech_names(p_loc text)
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select coalesce((select jsonb_agg(s.name order by s.name) from staff s
                    where s.shop_id = public.current_shop() and coalesce(s.active, true) and p_loc like 'van:%' and s.home_van_id::text = substr(p_loc, 5)), '[]'::jsonb);
$function$;
revoke all on function public.van_label(text) from public, anon, authenticated;
revoke all on function public.van_tech_names(text) from public, anon, authenticated;

create or replace function public.unit_send(p_unit text, p_to text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_role text := public.current_staff_role(); v_shop uuid := public.current_shop(); u inventory_units; v_open unit_transfers;
begin
  perform public.require_tier('inventory');
  if v_role is null or v_role not in ('owner', 'manager', 'technician') then raise exception 'moving a key needs a technician, manager or owner'; end if;
  if coalesce(btrim(p_to), '') = '' then raise exception 'pick where the key is going'; end if;
  select * into u from inventory_units where id = p_unit and shop_id = v_shop for update;
  if not found then raise exception 'No key with that serial in this shop.'; end if;
  if u.status <> 'in_stock' then raise exception 'This key is not in stock (it is marked %).', replace(u.status, '_', ' '); end if;
  select * into v_open from unit_transfers where unit_id = p_unit and accepted_at is null and cancelled_at is null;
  if u.location = p_to and v_open.id is null then
    return jsonb_build_object('ok', false, 'code', 'same_place', 'error', 'This key is already in ' || public.van_label(p_to) || '.', 'to', p_to);
  end if;
  if p_to like 'van:%' then
    if not exists (select 1 from vans v where v.id::text = substr(p_to, 5) and v.shop_id = v_shop and v.status <> 'retired') then raise exception 'That van was not found.'; end if;
    if v_open.id is not null then
      if v_open.to_loc = p_to then
        return jsonb_build_object('ok', true, 'pending', true, 'already', true, 'to', p_to, 'van_name', public.van_label(p_to), 'for_names', public.van_tech_names(p_to));
      end if;
      update unit_transfers set cancelled_by = auth.uid(), cancelled_at = now() where id = v_open.id;
    end if;
    if u.location = p_to then   -- it was on its way somewhere else and is being kept where it is
      return jsonb_build_object('ok', true, 'pending', false, 'to', p_to, 'van_name', public.van_label(p_to));
    end if;
    insert into unit_transfers(shop_id, unit_id, item_id, from_loc, to_loc) values (v_shop, p_unit, u.item_id, u.location, p_to);
    insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
      values (auth.uid(), v_role, 'unit_sent', 'inventory_units', p_unit, jsonb_build_object('item', u.item_id, 'from', u.location, 'to', p_to, 'serial', u.serial), v_shop);
    return jsonb_build_object('ok', true, 'pending', true, 'to', p_to, 'van_name', public.van_label(p_to), 'for_names', public.van_tech_names(p_to));
  end if;
  -- the shop (or any place that is not a van): it moves now — the person scanning is holding it there
  if v_open.id is not null then update unit_transfers set cancelled_by = auth.uid(), cancelled_at = now() where id = v_open.id; end if;
  if u.location <> p_to then
    update inventory_units set location = p_to, bin = '', updated_at = now() where id = p_unit and shop_id = v_shop;
    insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
      values (auth.uid(), v_role, 'unit_move', 'inventory_units', p_unit, jsonb_build_object('item', u.item_id, 'from', u.location, 'to', p_to, 'serial', u.serial), v_shop);
  end if;
  return jsonb_build_object('ok', true, 'pending', false, 'to', p_to, 'van_name', public.van_label(p_to));
end $function$;

create or replace function public.unit_accept(p_unit text, p_bin text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_role text := public.current_staff_role(); v_shop uuid := public.current_shop(); u inventory_units; t unit_transfers; v_mine boolean; v_names jsonb; v_bin text := left(coalesce(btrim(p_bin), ''), 80);
begin
  perform public.require_tier('inventory');
  if v_role is null then raise exception 'not staff'; end if;
  select * into t from unit_transfers where unit_id = p_unit and shop_id = v_shop and accepted_at is null and cancelled_at is null for update;
  if not found then raise exception 'This key is not waiting to be scanned in.'; end if;
  v_mine := exists (select 1 from staff s where s.user_id = auth.uid() and s.shop_id = v_shop and s.home_van_id::text = substr(t.to_loc, 5));
  if not (v_mine or public.is_manager()) then
    v_names := public.van_tech_names(t.to_loc);
    raise exception 'This key is going to % — % has to scan it in.', public.van_label(t.to_loc),
      case when jsonb_array_length(v_names) = 0 then 'the technician who drives it (or a manager)' else (select string_agg(x, ' or ') from jsonb_array_elements_text(v_names) x) end;
  end if;
  select * into u from inventory_units where id = p_unit and shop_id = v_shop for update;
  if u.status <> 'in_stock' then
    update unit_transfers set cancelled_by = auth.uid(), cancelled_at = now() where id = t.id;
    return jsonb_build_object('ok', false, 'code', 'not_in_stock', 'error', 'This key is no longer in stock (it is marked ' || replace(u.status, '_', ' ') || '), so it was not moved.');
  end if;
  update inventory_units set location = t.to_loc, bin = v_bin, updated_at = now() where id = p_unit and shop_id = v_shop;
  update unit_transfers set accepted_by = auth.uid(), accepted_at = now() where id = t.id;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (auth.uid(), v_role, 'unit_accepted', 'inventory_units', p_unit,
            jsonb_build_object('item', u.item_id, 'from', t.from_loc, 'to', t.to_loc, 'serial', u.serial, 'bin', v_bin, 'sent_by', t.sent_by, 'for_the_technician', not v_mine), v_shop);
  return jsonb_build_object('ok', true, 'to', t.to_loc, 'van_name', public.van_label(t.to_loc), 'item_id', u.item_id, 'serial', u.serial, 'bin', v_bin);
end $function$;

create or replace function public.unit_set_bin(p_unit text, p_bin text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_role text := public.current_staff_role(); v_shop uuid := public.current_shop(); v_bin text := left(coalesce(btrim(p_bin), ''), 80); v_old text; v_n int;
begin
  if v_role is null or v_role not in ('owner', 'manager', 'technician') then raise exception 'changing a key''s place needs a technician, manager or owner'; end if;
  select bin into v_old from inventory_units where id = p_unit and shop_id = v_shop;
  if not found then raise exception 'No key with that serial in this shop.'; end if;
  update inventory_units set bin = v_bin, updated_at = now() where id = p_unit and shop_id = v_shop;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (auth.uid(), v_role, 'unit_bin', 'inventory_units', p_unit, jsonb_build_object('from', coalesce(v_old, ''), 'to', v_bin), v_shop);
  return jsonb_build_object('ok', true, 'bin', v_bin);
end $function$;

create or replace function public.unit_transfer_cancel(p_unit text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_role text := public.current_staff_role(); v_shop uuid := public.current_shop(); t unit_transfers;
begin
  if v_role is null then raise exception 'not staff'; end if;
  select * into t from unit_transfers where unit_id = p_unit and shop_id = v_shop and accepted_at is null and cancelled_at is null for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'none', 'error', 'This key is not on its way anywhere.'); end if;
  if not (t.sent_by = auth.uid() or public.is_manager()) then raise exception 'Only the person who sent this key, or a manager, can take it back.'; end if;
  update unit_transfers set cancelled_by = auth.uid(), cancelled_at = now() where id = t.id;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (auth.uid(), v_role, 'unit_send_cancelled', 'inventory_units', p_unit, jsonb_build_object('item', t.item_id, 'from', t.from_loc, 'to', t.to_loc), v_shop);
  return jsonb_build_object('ok', true);
end $function$;

create or replace function public.unit_transfers_pending()
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  with me as (select s.home_van_id, public.is_manager() as mgr from staff s where s.user_id = auth.uid() and s.shop_id = public.current_shop() limit 1),
  open_t as (
    select t.*, u.serial, i.name as item_name, i.sku,
           (select s.name from staff s where s.user_id = t.sent_by and s.shop_id = t.shop_id limit 1) as sent_by_name
      from unit_transfers t
      join inventory_units u on u.id = t.unit_id
      left join inventory i on i.id = t.item_id and i.shop_id = t.shop_id
     where t.shop_id = public.current_shop() and t.accepted_at is null and t.cancelled_at is null),
  rows as (
    select o.*, jsonb_build_object('unit_id', o.unit_id, 'serial', o.serial, 'item_id', o.item_id, 'item_name', o.item_name, 'sku', o.sku, 'from', o.from_loc, 'to', o.to_loc,
             'van_name', public.van_label(o.to_loc), 'sent_by_name', coalesce(o.sent_by_name, ''), 'sent_at', o.sent_at, 'for_names', public.van_tech_names(o.to_loc)) as j
      from open_t o)
  select case when public.current_staff_role() is null then jsonb_build_object('mine', '[]'::jsonb, 'sent', '[]'::jsonb) else jsonb_build_object(
    'mine', coalesce((select jsonb_agg(r.j order by r.sent_at) from rows r, me where me.home_van_id is not null and r.to_loc = 'van:' || me.home_van_id::text), '[]'::jsonb),
    'sent', coalesce((select jsonb_agg(r.j order by r.sent_at) from rows r where r.sent_by = auth.uid() or (select mgr from me)), '[]'::jsonb)) end;
$function$;

revoke all on function public.unit_send(text, text) from public, anon;
revoke all on function public.unit_accept(text, text) from public, anon;
revoke all on function public.unit_set_bin(text, text) from public, anon;
revoke all on function public.unit_transfer_cancel(text) from public, anon;
revoke all on function public.unit_transfers_pending() from public, anon;
grant execute on function public.unit_send(text, text) to authenticated;
grant execute on function public.unit_accept(text, text) to authenticated;
grant execute on function public.unit_set_bin(text, text) to authenticated;
grant execute on function public.unit_transfer_cancel(text) to authenticated;
grant execute on function public.unit_transfers_pending() to authenticated;
