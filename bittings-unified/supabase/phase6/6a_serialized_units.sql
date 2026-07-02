-- ============================================================================
-- Phase 6 · 6a — Serialized inventory units (foundation for traceability)
-- ----------------------------------------------------------------------------
-- Each physical unit gets its own row (serial id), traceable through its life:
-- supplier + batch it came from, and whether it was sold / failed / warranty-out
-- / lost / written-off. COEXISTS with the qty model: a rollup trigger keeps
-- inventory_locations.qty = count of in_stock units per (item, location) for
-- SERIALIZED items, so every existing screen (📍 stock, POS, moves) keeps working.
-- Serialization is adopted PER ITEM on first receive (unit_receive) — nothing is
-- serialized until then, so real-shop qty data is untouched.
--
-- FUTURE per-unit vehicle fitment: inventory_units.fitment (jsonb) is reserved and
-- left null; inventory.fitment stays the item-level default. A later project can
-- write per-unit fitment with no schema change (serial → item → fitment join).
--
-- Applied live via mcp apply_migration (phase6_6a_serialized_units), 2026-07-01.
-- Idempotent. Depends on: phase1 (inventory, audit_log, roles), phase1b
-- (inventory_locations + fn_sync_inv_total), phase5 (current_shop/is_* helpers).
-- ============================================================================

alter table public.inventory add column if not exists serialized boolean not null default false;

create table if not exists public.inventory_units (
  id               text primary key default ('u_'||replace(gen_random_uuid()::text,'-','')),
  item_id          text not null references public.inventory(id) on delete cascade,
  shop_id          uuid not null default public.current_shop(),
  location         text not null default 'shop',            -- 'shop' | 'van:<id>' while in_stock
  status           text not null default 'in_stock'
                     check (status in ('in_stock','sold','warranty_out','failed','lost','written_off')),
  supplier         text default '',                          -- which supplier THIS unit came from
  batch            text default '',                          -- batch / lot
  unit_cost_cents  integer,                                  -- cost basis for this unit (dashboard)
  acquired_at      timestamptz not null default now(),
  sold_receipt_id  text,                                     -- the sale receipt (when sold)
  sold_customer_id uuid,
  sold_at          timestamptz,
  disposition      text default '',                          -- reason for failed/lost/written_off/warranty
  fitment          jsonb,                                    -- FUTURE per-unit vehicle fitment (null = use inventory.fitment)
  created_by       uuid default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists iu_item_idx      on public.inventory_units(item_id);
create index if not exists iu_shop_idx       on public.inventory_units(shop_id);
create index if not exists iu_stock_idx      on public.inventory_units(item_id, location, status);
create index if not exists iu_status_idx     on public.inventory_units(status);
create index if not exists iu_sold_rcpt_idx  on public.inventory_units(sold_receipt_id);

alter table public.inventory_units enable row level security;
grant select on public.inventory_units to authenticated;              -- reads for staff; writes via RPC only
revoke insert, update, delete on public.inventory_units from authenticated;
grant select, insert, update, delete on public.inventory_units to service_role;

drop policy if exists iu_select on public.inventory_units;
create policy iu_select on public.inventory_units for select to authenticated using (public.is_staff());
drop policy if exists inventory_units_tenant on public.inventory_units;
create policy inventory_units_tenant on public.inventory_units as restrictive for all to authenticated
  using (shop_id = public.current_shop()) with check (shop_id = public.current_shop());

-- Rollup: inventory_locations.qty = count(in_stock units) for SERIALIZED items.
create or replace function public.fn_units_rollup()
  returns trigger language plpgsql security definer set search_path = public as $$
declare arr text[]; pair text; v_item text; v_loc text; v_shop uuid; v_cnt int;
begin
  arr := array[]::text[];
  if TG_OP in ('INSERT','UPDATE') then arr := arr || (NEW.item_id||E'\t'||NEW.location||E'\t'||NEW.shop_id::text); end if;
  if TG_OP in ('UPDATE','DELETE') then arr := arr || (OLD.item_id||E'\t'||OLD.location||E'\t'||OLD.shop_id::text); end if;
  foreach pair in array arr loop
    v_item := split_part(pair,E'\t',1); v_loc := split_part(pair,E'\t',2); v_shop := split_part(pair,E'\t',3)::uuid;
    if exists (select 1 from inventory where id = v_item and coalesce(serialized,false)) then
      select count(*) into v_cnt from inventory_units where item_id=v_item and location=v_loc and status='in_stock';
      insert into inventory_locations(item_id, location, qty, shop_id) values (v_item, v_loc, v_cnt, v_shop)
        on conflict (item_id, location) do update set qty = excluded.qty, updated_at = now();
    end if;
  end loop;
  return null;
end $$;
drop trigger if exists trg_units_rollup on public.inventory_units;
create trigger trg_units_rollup after insert or update or delete on public.inventory_units
  for each row execute function public.fn_units_rollup();

-- Flip an item to serialized + convert existing per-location qty into units (preserves counts; idempotent).
create or replace function public.unit_ensure_serialized(p_item text)
  returns void language plpgsql security definer set search_path = public as $$
declare r record; i int; v_cost int;
begin
  select round(coalesce(cost,0)*100)::int into v_cost from inventory where id = p_item;
  update inventory set serialized = true where id = p_item and coalesce(serialized,false) = false;
  for r in select location, qty from inventory_locations where item_id = p_item and coalesce(qty,0) > 0 loop
    if not exists (select 1 from inventory_units where item_id=p_item and location=r.location) then
      for i in 1..r.qty loop
        insert into inventory_units(item_id, location, supplier, batch, unit_cost_cents, shop_id, created_by)
          values (p_item, r.location, '(pre-serialization)', '', v_cost, public.current_shop(), auth.uid());
      end loop;
    end if;
  end loop;
end $$;

-- RECEIVE serialized units (front_desk+). Flips the item serialized on first receive.
create or replace function public.unit_receive(p_item text, p_location text default 'shop', p_qty int default 1,
                                               p_supplier text default '', p_batch text default '', p_unit_cost_cents int default null)
  returns setof text language plpgsql security definer set search_path = public as $$
declare v_role text := public.current_staff_role(); v_id text; i int; v_cost int;
begin
  if v_role not in ('owner','manager','front_desk') then raise exception 'receive requires front desk, manager, or owner'; end if;
  if p_qty <= 0 then raise exception 'qty must be positive'; end if;
  if not exists (select 1 from inventory where id = p_item) then raise exception 'item not found'; end if;
  perform public.unit_ensure_serialized(p_item);
  v_cost := coalesce(p_unit_cost_cents, (select round(coalesce(cost,0)*100)::int from inventory where id=p_item));
  for i in 1..p_qty loop
    insert into inventory_units(item_id, location, supplier, batch, unit_cost_cents, shop_id, created_by)
      values (p_item, coalesce(nullif(p_location,''),'shop'), coalesce(p_supplier,''), coalesce(p_batch,''), v_cost, public.current_shop(), auth.uid())
      returning id into v_id;
    return next v_id;
  end loop;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'unit_receive', 'inventory_units', p_item,
            jsonb_build_object('location', coalesce(nullif(p_location,''),'shop'), 'qty', p_qty, 'supplier', p_supplier, 'batch', p_batch));
end $$;

-- MOVE one unit to another location (technician+), only while in_stock.
create or replace function public.unit_move(p_unit text, p_to text)
  returns void language plpgsql security definer set search_path = public as $$
declare v_role text := public.current_staff_role(); v_from text; v_item text;
begin
  if v_role not in ('owner','manager','technician') then raise exception 'move requires technician, manager, or owner'; end if;
  select location, item_id into v_from, v_item from inventory_units where id = p_unit and status = 'in_stock';
  if v_item is null then raise exception 'unit not found or not in stock'; end if;
  if v_from = p_to then raise exception 'from and to are the same location'; end if;
  update inventory_units set location = p_to, updated_at = now() where id = p_unit;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'unit_move', 'inventory_units', p_unit, jsonb_build_object('item', v_item, 'from', v_from, 'to', p_to));
end $$;

-- Generic disposition change (manager+): failed/lost/written_off/warranty_out/in_stock/sold.
create or replace function public.unit_set_status(p_unit text, p_status text, p_reason text default '')
  returns void language plpgsql security definer set search_path = public as $$
declare v_role text := public.current_staff_role(); v_old text; v_item text;
begin
  if not public.is_manager() then raise exception 'changing a unit''s status requires manager or owner'; end if;
  if p_status not in ('in_stock','sold','warranty_out','failed','lost','written_off') then raise exception 'invalid status'; end if;
  select status, item_id into v_old, v_item from inventory_units where id = p_unit;
  if v_item is null then raise exception 'unit not found'; end if;
  update inventory_units set status = p_status, disposition = coalesce(nullif(p_reason,''), disposition), updated_at = now() where id = p_unit;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'unit_status', 'inventory_units', p_unit, jsonb_build_object('item', v_item, 'old', v_old, 'new', p_status, 'reason', p_reason));
end $$;

revoke execute on function public.unit_ensure_serialized(text) from public;
revoke execute on function public.unit_receive(text,text,int,text,text,int) from public;
revoke execute on function public.unit_move(text,text) from public;
revoke execute on function public.unit_set_status(text,text,text) from public;
grant  execute on function public.unit_receive(text,text,int,text,text,int) to authenticated;
grant  execute on function public.unit_move(text,text) to authenticated;
grant  execute on function public.unit_set_status(text,text,text) to authenticated;
