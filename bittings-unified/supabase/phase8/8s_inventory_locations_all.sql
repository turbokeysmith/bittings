-- ============================================================================
-- 8s — shop-wide stock-by-location in one call + "everything lives in the shop" (2026-11-08)
-- ----------------------------------------------------------------------------
-- Owner: all stock is received at the SHOP and goes out to the vans from there; the
-- Inventory list should say where each part really is and default to Shop.
--   • inv_locations_all()  — staff: every (item_id, location, qty) row for the caller's shop
--                            in one round-trip (the client has no table grant on
--                            inventory_locations), so the list can label rows and filter
--                            by Shop / each van from real data instead of a per-device guess.
--   • one-time move: the only van-held stock today (item "ford", 4 units in van
--     362cb880…) is folded into its shop row (5 → 9) — logged.
-- Rollback: drop function public.inv_locations_all(); the move is logged in audit_log.
-- ============================================================================

create or replace function public.inv_locations_all()
returns table(item_id text, location text, qty integer)
language sql stable security definer set search_path = public as $$
  select l.item_id, l.location, coalesce(l.qty,0)::integer
    from public.inventory_locations l
   where l.shop_id = public.current_shop()
     and public.current_staff_role() is not null;
$$;
revoke all on function public.inv_locations_all() from public;
grant execute on function public.inv_locations_all() to authenticated;

-- one-time: fold van-held stock into the shop row for the owner's shop
do $$
declare r record;
begin
  for r in select item_id, location, qty from public.inventory_locations
            where shop_id = '7a1754e6-e2f1-40eb-9c03-9d9a1e891bce' and location like 'van:%' and coalesce(qty,0) > 0 loop
    insert into public.inventory_locations(item_id, location, qty, shop_id)
      values (r.item_id, 'shop', r.qty, '7a1754e6-e2f1-40eb-9c03-9d9a1e891bce')
      on conflict (item_id, location) do update set qty = public.inventory_locations.qty + excluded.qty, updated_at = now();
    update public.inventory_locations set qty = 0, updated_at = now()
     where item_id = r.item_id and location = r.location and shop_id = '7a1754e6-e2f1-40eb-9c03-9d9a1e891bce';
    insert into public.audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
      values (null, 'owner', 'inv_move', 'inventory', r.item_id,
              jsonb_build_object('from', r.location, 'to', 'shop', 'qty', r.qty, 'note', '8s: all stock homed at the shop (owner, 2026-11-08)'),
              '7a1754e6-e2f1-40eb-9c03-9d9a1e891bce');
  end loop;
end $$;
