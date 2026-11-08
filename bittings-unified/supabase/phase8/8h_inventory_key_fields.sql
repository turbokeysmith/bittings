-- ============================================================================
-- 8h — Inventory key fields: FCC ID + transponder chip (2026-11-08)
-- ----------------------------------------------------------------------------
-- Owner request: a key/remote record carries its FCC ID (shown for Smart Key /
-- Remote / Remote Head items) and its transponder chip (Remote / Remote Head /
-- Transponder items), next to the free-text "Fits" vehicle list that the app
-- parses client-side (app/fitment.js) so a year/make/model lookup finds the key.
--
--   • inventory.fcc_id  text  — e.g. HYQ4EA
--   • inventory.chip    text  — e.g. ID46 / HITAG 2 / Toyota H
--   • inventory_safe    — the cost-masking read view gains fcc_id, chip and
--     serialized (serialized was the "nice-to-have" from the 2026-11-07 review:
--     the client can now show the 🛡️/⚠️ unit buttons only on serialized rows).
--
-- Additive only: `create or replace view` appends the new columns after
-- sell_price_cents, keeping every existing column in place, so the view's
-- grants and the client's fromRow mapping are unaffected. No RLS change —
-- fcc_id/chip ride on the existing inventory policies (staff read via the view,
-- managers write), and the shop_id RESTRICTIVE fence from 5b still applies.
-- ============================================================================

alter table public.inventory add column if not exists fcc_id text not null default '';
alter table public.inventory add column if not exists chip   text not null default '';

create or replace view public.inventory_safe with (security_invoker = true) as
  select id, name, sku, category, qty, low_at, unit,
         case when public.is_manager() then cost else null end as cost,
         location, notes, supplier, reorder_qty, fitment, created_at, updated_at, deleted_at, deleted_by,
         sell_price_cents,
         fcc_id, chip, serialized
    from public.inventory
   where public.is_staff() and (deleted_at is null or public.is_manager());

grant select on public.inventory_safe to authenticated;

comment on column public.inventory.fcc_id is 'FCC ID of a remote / smart key (shown for Smart Key, Remote / Fob, Remote Head / Flip items)';
comment on column public.inventory.chip   is 'Transponder chip of a key (shown for Remote / Fob, Remote Head / Flip, Transponder items)';
