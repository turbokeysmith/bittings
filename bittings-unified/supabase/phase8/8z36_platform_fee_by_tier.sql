-- 8z36 — Platform fee by plan tier (owner decision 2026-11-11)
--   Starter pays 1% of each card payment, Pro pays 0%.
--   A shop can be pinned to a specific fee with shops.platform_fee_bps (basis points;
--   100 = 1%). NULL = follow the tier. Turbo Keysmith LLC is pinned to 1% so the owner
--   can see the fee working on their own (Pro) shop.
-- Read by the pay-create-intent edge function (service_role). Shop owners cannot change
-- it: `authenticated` only has UPDATE(name) on shops (5e).

alter table public.shops
  add column if not exists platform_fee_bps integer
  check (platform_fee_bps is null or (platform_fee_bps between 0 and 1000));

comment on column public.shops.platform_fee_bps is
  'Per-shop platform fee override in basis points (100 = 1%). NULL = by tier: starter 1%, pro 0%.';

update public.shops set platform_fee_bps = 100 where name = 'Turbo Keysmith LLC';
