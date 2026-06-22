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

-- ----------------------------------------------------------------------------
-- Receipts: strip per-line COST (margin) from the data payload for non-managers.
-- The app reads receipts through receipts_safe (store.js CLOUD_MAP.receipts
-- readTable='receipts_safe'); writes still target the receipts table. Edge
-- functions that compute COGS read the base `receipts` table via service_role,
-- so cost-of-goods is unaffected. Only `cost` + `unitCost` carry margin (the
-- `totals` object is the customer-facing pricing).
-- ----------------------------------------------------------------------------
create or replace function public.strip_receipt_costs(d jsonb)
  returns jsonb language sql immutable set search_path = public as $$
  select case
    when d ? 'items' and jsonb_typeof(d->'items') = 'array' then
      jsonb_set(d, '{items}', (
        select coalesce(jsonb_agg(it - 'cost' - 'unitCost'), '[]'::jsonb)
        from jsonb_array_elements(d->'items') it
      ))
    else d
  end
$$;

create or replace view public.receipts_safe as
  select id,
         case when public.is_manager() then data else public.strip_receipt_costs(data) end as data,
         created_at, updated_at, deleted_at, deleted_by
    from public.receipts
   where public.is_staff() and (deleted_at is null or public.is_manager());
grant select on public.receipts_safe to authenticated;
