-- ============================================================================
-- Phase 1 / Stage 1b — Fleet (vans) + per-location inventory
-- Additive + idempotent. Stock lives at a LOCATION ('shop' | 'van:<id>') and
-- stays with the VAN, not the tech. Qty changes go through role-checked RPCs
-- (move = tech+, receive = front_desk+, adjust = manager+); the legacy
-- inventory.qty becomes the synced TOTAL across locations.
-- ============================================================================

-- 1. vans (company-owned fleet) -------------------------------------------------
create table if not exists public.vans (
  id          uuid primary key default gen_random_uuid(),
  fleet_no    text,
  vin         text,
  nickname    text,
  plate       text,
  status      text not null default 'active' check (status in ('active','maintenance','down','retired')),
  shop_id     uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- a van must be identifiable by at least a fleet # OR a VIN
  constraint vans_identifiable check (coalesce(nullif(fleet_no,''), nullif(vin,'')) is not null)
);
alter table public.vans enable row level security;
grant select, insert, update, delete on public.vans to authenticated;
grant select, insert, update, delete on public.vans to service_role;

drop policy if exists vans_select on public.vans;
create policy vans_select on public.vans for select to authenticated using (public.is_staff());
drop policy if exists vans_insert on public.vans;
create policy vans_insert on public.vans for insert to authenticated with check (public.is_manager());   -- manage fleet = manager+
drop policy if exists vans_update on public.vans;
create policy vans_update on public.vans for update to authenticated using (public.is_manager()) with check (public.is_manager());
drop policy if exists vans_delete on public.vans;
create policy vans_delete on public.vans for delete to authenticated using (public.is_owner());          -- hard delete = owner only

-- tech ↔ van: staff.home_van_id already exists (1a); add the FK now
alter table public.staff drop constraint if exists staff_home_van_fk;
alter table public.staff add constraint staff_home_van_fk foreign key (home_van_id) references public.vans(id) on delete set null;

-- 2. inventory_locations (per-location qty) ------------------------------------
create table if not exists public.inventory_locations (
  id         uuid primary key default gen_random_uuid(),
  item_id    text not null references public.inventory(id) on delete cascade,
  location   text not null,                -- 'shop' | 'van:<van_id>'
  qty        integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (item_id, location)
);
alter table public.inventory_locations enable row level security;
grant select on public.inventory_locations to authenticated;          -- read only; writes go through the RPCs below
revoke insert, update, delete on public.inventory_locations from authenticated;
grant select, insert, update, delete on public.inventory_locations to service_role;

drop policy if exists invloc_select on public.inventory_locations;
create policy invloc_select on public.inventory_locations for select to authenticated using (public.is_staff());

-- backfill: put existing stock at the shop (safe if inventory is empty)
insert into public.inventory_locations(item_id, location, qty)
select id, 'shop', coalesce(qty,0) from public.inventory
on conflict (item_id, location) do nothing;

-- keep the legacy inventory.qty as the synced TOTAL across locations
create or replace function public.fn_sync_inv_total()
  returns trigger language plpgsql security definer set search_path = public as $$
declare v_item text;
begin
  v_item := coalesce(new.item_id, old.item_id);
  update public.inventory
     set qty = coalesce((select sum(qty) from public.inventory_locations where item_id = v_item), 0),
         updated_at = now()
   where id = v_item;
  return null;
end $$;
drop trigger if exists trg_inv_total on public.inventory_locations;
create trigger trg_inv_total after insert or update or delete on public.inventory_locations
  for each row execute function public.fn_sync_inv_total();

-- 3. role-checked stock RPCs (the only writers of inventory_locations) ----------
-- MOVE qty between locations (technician+). Stock follows the van, not the tech.
create or replace function public.inv_move(p_item text, p_from text, p_to text, p_qty int)
  returns void language plpgsql security definer set search_path = public as $$
declare v_have int;
begin
  if public.current_staff_role() not in ('owner','manager','technician') then raise exception 'move requires technician, manager, or owner'; end if;
  if p_qty <= 0 then raise exception 'qty must be positive'; end if;
  if p_from = p_to then raise exception 'from and to are the same location'; end if;
  select coalesce(qty,0) into v_have from inventory_locations where item_id = p_item and location = p_from;
  if coalesce(v_have,0) < p_qty then raise exception 'not enough stock at %', p_from; end if;
  update inventory_locations set qty = qty - p_qty, updated_at = now() where item_id = p_item and location = p_from;
  insert into inventory_locations(item_id, location, qty) values (p_item, p_to, p_qty)
    on conflict (item_id, location) do update set qty = inventory_locations.qty + excluded.qty, updated_at = now();
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), public.current_staff_role(), 'inventory_move', 'inventory', p_item,
            jsonb_build_object('from', p_from, 'to', p_to, 'qty', p_qty));
end $$;

-- RECEIVE new stock into the shop (front_desk+).
create or replace function public.inv_receive(p_item text, p_qty int)
  returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_staff_role() not in ('owner','manager','front_desk') then raise exception 'receive requires front desk, manager, or owner'; end if;
  if p_qty <= 0 then raise exception 'qty must be positive'; end if;
  insert into inventory_locations(item_id, location, qty) values (p_item, 'shop', p_qty)
    on conflict (item_id, location) do update set qty = inventory_locations.qty + excluded.qty, updated_at = now();
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), public.current_staff_role(), 'inventory_receive', 'inventory', p_item,
            jsonb_build_object('location', 'shop', 'qty', p_qty));
end $$;

-- ADJUST a count / write-off at a location (manager+). Shrinkage gate + logged.
create or replace function public.inv_adjust(p_item text, p_loc text, p_new_qty int, p_reason text)
  returns void language plpgsql security definer set search_path = public as $$
declare v_old int;
begin
  if not public.is_manager() then raise exception 'adjust/write-off requires manager or owner'; end if;
  if p_new_qty < 0 then raise exception 'qty cannot be negative'; end if;
  select coalesce(qty,0) into v_old from inventory_locations where item_id = p_item and location = p_loc;
  insert into inventory_locations(item_id, location, qty) values (p_item, p_loc, p_new_qty)
    on conflict (item_id, location) do update set qty = excluded.qty, updated_at = now();
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), public.current_staff_role(), 'inventory_adjust', 'inventory', p_item,
            jsonb_build_object('location', p_loc, 'old', coalesce(v_old,0), 'new', p_new_qty, 'reason', coalesce(p_reason,'')));
end $$;

-- only signed-in staff may call them (each self-checks role); never anon/public
revoke execute on function public.inv_move(text,text,text,int)  from public;
revoke execute on function public.inv_receive(text,int)         from public;
revoke execute on function public.inv_adjust(text,text,int,text) from public;
grant  execute on function public.inv_move(text,text,text,int)  to authenticated;
grant  execute on function public.inv_receive(text,int)         to authenticated;
grant  execute on function public.inv_adjust(text,text,int,text) to authenticated;
