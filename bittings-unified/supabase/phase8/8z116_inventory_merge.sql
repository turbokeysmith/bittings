-- 8z116 (owner, 2026-11-13): "I have 101 items that are out of stock, but some of those are probably different part
-- numbers or SKUs that I need to either merge or delete. Can we add an internal scrubber to scrub possible items that are
-- the same and I — or the owner/manager — can say yes it's the same and it either deletes one or merges them, or no it's
-- not and it stays in the system as it is."
--
-- The screen (Inventory → "Find duplicates") finds likely duplicates in the browser. This file is the server half:
--   inventory_dupe_decisions   the pairs a manager said are NOT the same (so they never come back)
--   dupe_decisions()           → the list of those pairs
--   dupe_decide(a, b, 'different' | 'clear')
--   inventory_merge(keep, drop) → one transaction: the DROPPED item's stock, history and blank details move onto the KEPT
--                                 item; the dropped item is hidden (soft delete, deleted_at) and remembers where it went
--                                 (merged_into). Nothing is hard-deleted, so it can be looked at (or undone by hand) later.
-- Manager / owner only. Everything is in the audit log, with a full copy of both items from before the merge.
--
-- NOT RUN by the helper that wrote it — the lead trials it first (see the "to check against the live database" list at the end).

alter table public.inventory add column if not exists merged_into text;   -- id of the item this one was merged into (null = never merged)

-- ---------------------------------------------------------------------------------------------------------------------
-- 1) decisions: "these two are NOT the same"
-- ---------------------------------------------------------------------------------------------------------------------
create table if not exists public.inventory_dupe_decisions (
  shop_id    uuid not null default public.current_shop() references public.shops(id) on delete cascade,
  a_id       text not null,
  b_id       text not null,
  decision   text not null check (decision in ('different')),
  decided_by uuid default auth.uid(),
  decided_at timestamptz not null default now(),
  primary key (shop_id, a_id, b_id),
  constraint inventory_dupe_decisions_order check (a_id < b_id)      -- the pair is stored once, smaller id first
);
alter table public.inventory_dupe_decisions enable row level security;   -- no policies: the functions below are the only way in
revoke all on public.inventory_dupe_decisions from public, anon, authenticated;
grant all on public.inventory_dupe_decisions to service_role;

create or replace function public.dupe_decisions()
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select case when not public.is_manager() then '[]'::jsonb else coalesce((
    select jsonb_agg(jsonb_build_object('a', d.a_id, 'b', d.b_id, 'decision', d.decision) order by d.a_id, d.b_id)
      from inventory_dupe_decisions d where d.shop_id = public.current_shop()), '[]'::jsonb) end;
$function$;

create or replace function public.dupe_decide(p_a text, p_b text, p_decision text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_shop uuid := public.current_shop(); v_lo text; v_hi text; v_n int;
begin
  if v_shop is null or not public.is_manager() then raise exception 'only a manager/owner can decide this'; end if;
  perform public.require_tier('inventory');
  if coalesce(p_a, '') = '' or coalesce(p_b, '') = '' or p_a = p_b then raise exception 'pick two different items'; end if;
  if coalesce(p_decision, '') not in ('different', 'clear') then raise exception 'unknown decision'; end if;
  v_lo := least(p_a, p_b); v_hi := greatest(p_a, p_b);
  if p_decision = 'different' then
    if (select count(*) from inventory where shop_id = v_shop and id in (v_lo, v_hi)) <> 2 then
      raise exception 'one of those items was not found in your shop';
    end if;
    insert into inventory_dupe_decisions(shop_id, a_id, b_id, decision) values (v_shop, v_lo, v_hi, 'different')
      on conflict (shop_id, a_id, b_id) do update set decision = 'different', decided_by = auth.uid(), decided_at = now();
    v_n := 1;
  else
    delete from inventory_dupe_decisions where shop_id = v_shop and a_id = v_lo and b_id = v_hi;
    get diagnostics v_n = row_count;
  end if;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (auth.uid(), public.current_staff_role(), 'inventory_dupe_' || p_decision, 'inventory', v_lo,
            jsonb_build_object('a', v_lo, 'b', v_hi, 'decision', p_decision), v_shop);
  return jsonb_build_object('ok', true, 'changed', v_n);
end $function$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 2) the merge
-- ---------------------------------------------------------------------------------------------------------------------
-- How stock is counted here (read from 6a / 6b / 8f / 8z112):
--   * a NOT serial-numbered item: its pieces are inventory_locations.qty per location ('shop' / 'van:<id>').
--   * a serial-numbered item: its pieces are inventory_units rows with status 'in_stock'; the trigger fn_units_rollup
--     (after every insert / update / delete on inventory_units) recounts the in_stock units of the (item, location) of the
--     OLD row and of the NEW row and writes that count into inventory_locations.qty (insert-or-update, only when the item is
--     serialized). So changing a unit's item_id recounts BOTH the old item's location and the new item's location.
--   * inventory.qty is just the total of the locations, kept by trigger fn_sync_inv_total (and the app never sends it).
-- So: for serial-numbered stock we move the units and let the roll-up do the location rows; for plain stock we add the
-- location quantities ourselves.
create or replace function public.inventory_merge(p_keep text, p_drop text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_shop uuid := public.current_shop();
  k inventory; d inventory;
  v_ser boolean; v_before numeric; v_after numeric; v_drop_pieces numeric; v_drop_after numeric;
  v_snap_k jsonb; v_snap_d jsonb; v_locs_d jsonb; v_units_d jsonb;
  r record; v_fit text; v_line text; v_seen text[] := array[]::text[]; v_moved_units int := 0;
  v_cost numeric; v_price int;
begin
  if v_shop is null or not public.is_manager() then raise exception 'only a manager/owner can merge items'; end if;
  perform public.require_tier('inventory');
  if coalesce(p_keep, '') = '' or coalesce(p_drop, '') = '' or p_keep = p_drop then raise exception 'pick two different items'; end if;

  -- lock both rows (always in id order, so two managers merging at once cannot deadlock)
  perform 1 from inventory where shop_id = v_shop and id in (p_keep, p_drop) order by id for update;
  select * into k from inventory where id = p_keep and shop_id = v_shop;
  if not found then raise exception 'the item to keep was not found in your shop'; end if;
  select * into d from inventory where id = p_drop and shop_id = v_shop;
  if not found then raise exception 'the item to remove was not found in your shop'; end if;
  if k.deleted_at is not null or d.deleted_at is not null then raise exception 'one of these items was already removed — refresh and look again'; end if;

  -- a stock count in progress would still apply a count to the item that is about to disappear: finish it first
  if exists (select 1 from cycle_count_lines l join cycle_counts c on c.id = l.count_id
              where l.item_id = p_drop and l.shop_id = v_shop and c.status = 'open') then
    raise exception 'the item to remove is on a stock count that is still open — finish or discard that count first';
  end if;

  v_snap_k := to_jsonb(k); v_snap_d := to_jsonb(d);
  v_locs_d  := coalesce((select jsonb_agg(jsonb_build_object('location', location, 'qty', qty)) from inventory_locations where item_id = p_drop), '[]'::jsonb);
  v_units_d := coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from inventory_units where item_id = p_drop group by status) s), '{}'::jsonb);

  -- stock that was never put on a location sits on the shop shelf (same rule as 8z112) — otherwise it would not be counted or moved
  for r in select id, qty from inventory where id in (p_keep, p_drop) loop
    if coalesce(r.qty, 0) > 0 and not exists (select 1 from inventory_locations l where l.item_id = r.id) then
      insert into inventory_locations(item_id, location, qty, shop_id) values (r.id, 'shop', r.qty, v_shop);
    end if;
  end loop;

  v_ser := coalesce(k.serialized, false) or coalesce(d.serialized, false);
  if v_ser then
    -- turn both into serial-numbered stock (idempotent; converts each location's qty into units, qty unchanged)
    perform public.unit_ensure_serialized(p_keep);
    perform public.unit_ensure_serialized(p_drop);
  end if;

  -- pieces before: serial-numbered = in_stock units, plain = location quantities
  select coalesce(sum(case when coalesce(i.serialized, false)
                           then (select count(*) from inventory_units u where u.item_id = i.id and u.status = 'in_stock')
                           else (select coalesce(sum(l.qty), 0) from inventory_locations l where l.item_id = i.id) end), 0)
    into v_before from inventory i where i.id in (p_keep, p_drop);
  select case when coalesce(i.serialized, false)
              then (select count(*) from inventory_units u where u.item_id = i.id and u.status = 'in_stock')
              else (select coalesce(sum(l.qty), 0) from inventory_locations l where l.item_id = i.id) end
    into v_drop_pieces from inventory i where i.id = p_drop;

  if v_ser then
    -- every unit of the dropped item (in stock, sold, failed … — they are its history too) now belongs to the kept item.
    -- fn_units_rollup recounts (dropped, location) → 0 and (kept, location) → its new total, for each unit moved.
    update inventory_units set item_id = p_keep, updated_at = now() where item_id = p_drop and shop_id = v_shop;
    get diagnostics v_moved_units = row_count;
    -- belt and braces: any location row left on the dropped item (e.g. a location that had only non-in-stock units) is zeroed
    update inventory_locations set qty = 0, updated_at = now() where item_id = p_drop and coalesce(qty, 0) <> 0;
  else
    for r in select location, qty from inventory_locations where item_id = p_drop and coalesce(qty, 0) > 0 loop
      insert into inventory_locations(item_id, location, qty, shop_id) values (p_keep, r.location, r.qty, v_shop)
        on conflict (item_id, location) do update set qty = inventory_locations.qty + excluded.qty, updated_at = now();
    end loop;
    update inventory_locations set qty = 0, updated_at = now() where item_id = p_drop and coalesce(qty, 0) <> 0;
  end if;

  -- the total across the two items must be exactly what it was
  select coalesce(sum(l.qty), 0) into v_after from inventory_locations l where l.item_id in (p_keep, p_drop);
  select coalesce(sum(l.qty), 0) into v_drop_after from inventory_locations l where l.item_id = p_drop;
  if v_after <> v_before or v_drop_after <> 0 then
    raise exception 'Stopped: the stock count would have changed (% before, % after). Nothing was changed.', v_before, v_after using errcode = 'P0001';
  end if;
  if v_ser and (select count(*) from inventory_units u where u.item_id = p_keep and u.status = 'in_stock') <> v_after then
    raise exception 'Stopped: the units do not match the stock count. Nothing was changed.' using errcode = 'P0001';
  end if;

  -- history that points at the dropped item (plain log rows) now points at the kept one.
  -- NOT touched on purpose: receipts (documents stay exactly as issued), audit_log (history), price_batches.changes and
  -- receive_tasks.summary (saved snapshots).
  update move_requests set item_id = p_keep, item_name = k.name where item_id = p_drop;
  update job_parts set item_id = p_keep where item_id = p_drop;
  update supplier_returns set item_id = p_keep, updated_at = now() where item_id = p_drop and shop_id = v_shop;
  -- count lines of finished counts (a unique (count, item, location) key means a clash is left as it was)
  update cycle_count_lines l set item_id = p_keep
   where l.item_id = p_drop and l.shop_id = v_shop
     and not exists (select 1 from cycle_count_lines o where o.count_id = l.count_id and o.item_id = p_keep and o.location = l.location);

  -- details: fill what the kept item is missing from the dropped one
  v_fit := coalesce(k.fitment, '');
  for v_line in select btrim(x) from unnest(string_to_array(replace(v_fit, E'\r', ''), E'\n')) x loop
    if v_line <> '' then v_seen := v_seen || lower(v_line); end if;
  end loop;
  for v_line in select btrim(x) from unnest(string_to_array(replace(coalesce(d.fitment, ''), E'\r', ''), E'\n')) x loop
    if v_line <> '' and not (lower(v_line) = any (v_seen)) then
      v_fit := case when btrim(v_fit) = '' then v_line else rtrim(v_fit, E'\r\n') || E'\n' || v_line end;
      v_seen := v_seen || lower(v_line);
    end if;
  end loop;
  v_cost  := case when coalesce(k.cost, 0) = 0 then d.cost else k.cost end;
  v_price := case when coalesce(k.sell_price_cents, 0) = 0 then d.sell_price_cents else k.sell_price_cents end;

  update inventory set
    fcc_id           = case when coalesce(btrim(fcc_id), '') = ''     then coalesce(d.fcc_id, '')     else fcc_id end,
    chip             = case when coalesce(btrim(chip), '') = ''       then coalesce(d.chip, '')       else chip end,
    vendor_sku       = case when coalesce(btrim(vendor_sku), '') = '' then coalesce(d.vendor_sku, '') else vendor_sku end,
    supplier         = case when coalesce(btrim(supplier), '') = ''   then coalesce(d.supplier, '')   else supplier end,
    location         = case when coalesce(btrim(location), '') = ''   then coalesce(d.location, '')   else location end,
    cost             = v_cost,
    sell_price_cents = v_price,
    fitment          = v_fit,
    updated_at       = now()
  where id = p_keep and shop_id = v_shop;

  -- the dropped item: hidden the way the app hides removed things (deleted_at / deleted_by), and it remembers where it went
  update inventory set deleted_at = now(), deleted_by = auth.uid(), merged_into = p_keep, updated_at = now()
   where id = p_drop and shop_id = v_shop;

  -- a "not the same" decision about either item no longer means anything
  delete from inventory_dupe_decisions where shop_id = v_shop and (a_id = p_drop or b_id = p_drop);

  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (auth.uid(), public.current_staff_role(), 'inventory_merge', 'inventory', p_keep,
            jsonb_build_object('kept', p_keep, 'dropped', p_drop, 'pieces_moved', v_drop_pieces, 'units_moved', v_moved_units,
                               'serialized', v_ser, 'pieces_total', v_after,
                               'kept_before', v_snap_k, 'dropped_before', v_snap_d,
                               'dropped_locations_before', v_locs_d, 'dropped_units_before', v_units_d), v_shop);

  return jsonb_build_object('ok', true, 'kept', p_keep, 'dropped', p_drop, 'pieces_moved', v_drop_pieces);
end $function$;

revoke all on function public.dupe_decisions() from public, anon;
revoke all on function public.dupe_decide(text, text, text) from public, anon;
revoke all on function public.inventory_merge(text, text) from public, anon;
grant execute on function public.dupe_decisions() to authenticated;
grant execute on function public.dupe_decide(text, text, text) to authenticated;
grant execute on function public.inventory_merge(text, text) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- To check against the live database (could not be settled from the files):
--  * inventory_locations has a shop_id column and a unique (item_id, location) key (8f / 8z112 insert shop_id; 1b defines the key).
--  * move_requests / job_parts / supplier_returns / cycle_count_lines column names as used above (item_id, item_name, updated_at, shop_id)
--    — job_parts and move_requests may have no shop_id (not used here). Tables created outside these files are not known.
--  * the manager's read view inventory_safe returns soft-deleted rows to managers (deleted_at is not null or is_manager()),
--    and the app's inventory store does not hide them — the app side adds hideDeleted for the inventory collection.
--  * a before-update trigger on inventory other than inventory_touch (would show up in a trial run).
--  * bookings (jobs) and receipts keep part ids inside jsonb; those are left as issued. warranty_replace looks a sale's unit up
--    by the receipt's partId, so a warranty claim on an OLD sale of the removed item will not find its unit afterwards.
-- ---------------------------------------------------------------------------------------------------------------------
