-- Phase 6 · 6e — inventory dashboard aggregates (manager+; shop-scoped).
-- Retail + cost value of on-hand stock, plus warranty-replacement / failed-key /
-- outstanding-return counts. Covers serialized (units) + non-serialized (qty); cost
-- uses per-unit cost for serialized units, item cost for non-serialized.
-- Applied live via mcp apply_migration (phase6_6e_inventory_dashboard), 2026-07-01.
create or replace function public.inventory_dashboard()
  returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_shop uuid := public.current_shop(); v jsonb;
begin
  if not public.is_manager() then raise exception 'inventory value is manager/owner only'; end if;
  select jsonb_build_object(
    'in_stock_units', (select count(*) from inventory_units where shop_id=v_shop and status='in_stock'),
    'retail_cents', coalesce((select sum(il.qty * coalesce(i.sell_price_cents,0))
                                from inventory_locations il join inventory i on i.id=il.item_id
                               where i.shop_id=v_shop and i.deleted_at is null),0),
    'cost_cents',
      coalesce((select sum(coalesce(u.unit_cost_cents, round(i.cost*100)::int))
                  from inventory_units u join inventory i on i.id=u.item_id
                 where u.shop_id=v_shop and u.status='in_stock'),0)
      + coalesce((select sum(il.qty * round(i.cost*100)::int)
                    from inventory_locations il join inventory i on i.id=il.item_id
                   where i.shop_id=v_shop and not coalesce(i.serialized,false) and i.deleted_at is null),0),
    'warranty_replacements', (select count(*) from inventory_units where shop_id=v_shop and status='warranty_out'),
    'failed_keys',           (select count(*) from inventory_units where shop_id=v_shop and status='failed'),
    'returns_needed',        (select count(*) from supplier_returns where shop_id=v_shop and status='needs_return'),
    'returns_sent',          (select count(*) from supplier_returns where shop_id=v_shop and status='sent')
  ) into v;
  return v;
end $$;
revoke execute on function public.inventory_dashboard() from public;
grant execute on function public.inventory_dashboard() to authenticated;
