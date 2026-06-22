-- ============================================================================
-- Phase 1 / Stage 1d — field-level money: hide part COST from non-managers
-- The app reads inventory through this view (store.js CLOUD_MAP.inventory
-- readTable='inventory_safe'); writes still target the inventory table. cost is
-- physically NULL in a technician/front_desk payload — not just hidden on screen.
-- ============================================================================
create or replace view public.inventory_safe as
  select id, name, sku, category, qty, low_at, unit,
         case when public.is_manager() then cost else null end as cost,
         location, notes, supplier, reorder_qty, fitment, created_at, updated_at, deleted_at, deleted_by
    from public.inventory
   where public.is_staff() and (deleted_at is null or public.is_manager());
grant select on public.inventory_safe to authenticated;
