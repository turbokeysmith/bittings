-- ============================================================================
-- 8k — "Vehicle fitment" becomes a plan feature (owner decision, 2026-11-08)
-- ----------------------------------------------------------------------------
-- The Year / Make / Model finder, the VIN box, FCC ID + transponder-chip fields
-- and the fits-first part pickers are included from the STARTER plan up. A
-- Lookup-plan shop still gets its plain parts list: names, SKUs, quantities,
-- cost / price, Category / Sub-category / Brand, import and export.
--
--   • tier_allows('fitment')  → starter, pro
--   • inventory_safe          → fitment / fcc_id / chip read as '' unless the
--                               shop's plan allows 'fitment' (server-side gate:
--                               a locked shop never receives the data). The app
--                               also stops WRITING those three columns while
--                               locked, so an edit on a Lookup plan can't wipe
--                               them (store.js toRow).
--   • vin_decodes             → one row per VIN decode made through the
--                               `vin-decode` edge function (plan-gated + metered;
--                               managers can read their shop's usage).
-- Both live shops are on Pro today, so nothing changes for them.
-- Rollback: re-run phase4/4a_tiers.sql (tier_allows) and phase8/8i_inventory_grade_brand.sql (view);
--           drop table public.vin_decodes;
-- ============================================================================

create or replace function public.tier_allows(feature text)
returns boolean language sql stable security definer set search_path=public as $$
  with t as (select public.shop_tier() as tier)
  select case
    -- reference tools: every tier (even lookup)
    when feature in ('lookup','keycodes','programmers','lishi') then true
    -- operational features: starter and up  (8k: + fitment = VIN / year-make-model / FCC key finding)
    when feature in ('pos','receipts','customers','inventory','scheduler','fitment')
      then (select tier in ('starter','pro') from t)
    -- premium features: pro only
    when feature in ('commission','fleet','reports','dashboard','nastf','closeout','move_requests')
      then (select tier = 'pro' from t)
    else false
  end;
$$;

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
         grade, brand
    from public.inventory
   where public.is_staff() and (deleted_at is null or public.is_manager());

grant select on public.inventory_safe to authenticated;

-- usage metering for VIN decodes (written by the vin-decode edge function with the service role)
create table if not exists public.vin_decodes (
  id         bigserial primary key,
  shop_id    uuid not null,
  user_id    uuid,
  vin        text not null,
  year       text not null default '',
  make       text not null default '',
  model      text not null default '',
  source     text not null default 'vpic',
  created_at timestamptz not null default now()
);
create index if not exists vin_decodes_shop_idx on public.vin_decodes(shop_id, created_at desc);
alter table public.vin_decodes enable row level security;
grant select on public.vin_decodes to authenticated;
revoke insert, update, delete on public.vin_decodes from authenticated;
drop policy if exists vin_decodes_read on public.vin_decodes;
create policy vin_decodes_read on public.vin_decodes
  for select to authenticated
  using (shop_id = public.current_shop() and public.is_manager());

comment on table public.vin_decodes is '8k: one row per VIN decoded through the vin-decode edge function (plan-gated, per-shop usage)';
