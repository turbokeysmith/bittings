-- ============================================================================
-- 8p — Inventory: vendor SKU (the supplier's own part number) on every part (2026-11-08)
-- ----------------------------------------------------------------------------
-- Owner request: "add vendor SKU to the inventory and have it be on the reorder
-- list". Your SKU stays `sku`; the number the DISTRIBUTOR uses for the same item
-- goes in `vendor_sku`, so the Reorder list / email / CSV speak the supplier's
-- language. Searchable in the finder, on the part form next to Supplier,
-- exported and importable ("vendor sku" / "supplier part #" column).
-- Additive only; inventory_safe recreated with vendor_sku appended (same pattern as 8h/8i/8k).
-- Rollback: alter table public.inventory drop column vendor_sku; re-run 8k_fitment_tier.sql (view).
-- ============================================================================

alter table public.inventory add column if not exists vendor_sku text not null default '';

create or replace view public.inventory_safe with (security_invoker = true) as
  select id, name, sku, category, qty, low_at, unit,
         case when public.is_manager() then cost else null end as cost,
         location, notes, supplier, reorder_qty,
         case when public.tier_allows('fitment') then fitment else '' end as fitment,
         created_at, updated_at, deleted_at, deleted_by,
         sell_price_cents,
         case when public.tier_allows('fitment') then fcc_id else '' end as fcc_id,
         case when public.tier_allows('fitment') then chip   else '' end as chip,
         serialized,
         grade, brand,
         vendor_sku
    from public.inventory
   where public.is_staff() and (deleted_at is null or public.is_manager());

grant select on public.inventory_safe to authenticated;

comment on column public.inventory.vendor_sku is '8p: the supplier''s own part number for this item (shown on the Reorder list; your SKU stays in sku)';
