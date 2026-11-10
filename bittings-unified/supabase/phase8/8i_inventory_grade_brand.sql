-- ============================================================================
-- 8i — Inventory: explicit Category (grade) + Brand on every SKU (2026-11-08)
-- ----------------------------------------------------------------------------
-- Owner request: every SKU carries its own category / sub-category choice instead
-- of the app guessing from the SKU suffix, and universal keys (Autel IKEY, Xhorse,
-- KeyDIY, Lonsdor …) carry the company they come from.
--
--   • inventory.grade  text — 'Aftermarket' | 'OEM New' | 'OEM Refurbished' | 'Universal'
--                              (blank for Accessories / Services, whose category column
--                              already says what they are)
--   • inventory.brand  text — maker of a universal key (Autel, Xhorse, KeyDIY, Lonsdor, …);
--                              free text, picked from the Setup checklist in the app
--   • inventory_safe   — the cost-masking read view gains grade, brand (appended)
--
-- Sub-category stays in the existing `category` column as "Keys/<sub>",
-- "Accessories/<sub>", "Services/<sub>" (unchanged shape, nothing else to migrate).
--
-- Additive only, same pattern as 8h: `create or replace view` appends the new
-- columns after serialized so every existing column, grant and client mapping
-- is untouched. No RLS change — the new columns ride on the inventory policies
-- (staff read via the view, managers write) and the 5b shop_id fence.
-- Rollback: alter table public.inventory drop column grade, drop column brand;
--           then re-run supabase/phase8/8h_inventory_key_fields.sql (view).
-- ============================================================================

alter table public.inventory add column if not exists grade text not null default '';
alter table public.inventory add column if not exists brand text not null default '';

create or replace view public.inventory_safe with (security_invoker = true) as
  select id, name, sku, category, qty, low_at, unit,
         case when public.is_manager() then cost else null end as cost,
         location, notes, supplier, reorder_qty, fitment, created_at, updated_at, deleted_at, deleted_by,
         sell_price_cents,
         fcc_id, chip, serialized,
         grade, brand
    from public.inventory
   where public.is_staff() and (deleted_at is null or public.is_manager());

grant select on public.inventory_safe to authenticated;

comment on column public.inventory.grade is 'Owner category of a key SKU: Aftermarket / OEM New / OEM Refurbished / Universal (blank for Accessories & Services)';
comment on column public.inventory.brand is 'Maker of a universal key (Autel, Xhorse, KeyDIY, Lonsdor, …)';
