-- ============================================================================
-- Phase 5g — shop_config becomes PER-SHOP (pre-pilot review 🔴 #4).
-- ----------------------------------------------------------------------------
-- payments_setup.sql pinned shop_config to a single row (id int default 1 +
-- CHECK id=1), so a second shop could never save its own Settings (identity,
-- tax, hours, catalog). Phase 5a already added shop_id (default current_shop())
-- and the RESTRICTIVE tenant fence — this migration just removes the singleton:
--   • drop the CHECK,
--   • id becomes an auto-increment surrogate (existing row keeps id=1),
--   • exactly ONE config row per shop (unique shop_id) — the client upserts
--     on conflict (shop_id).
-- Server readers (pos_checkout, warranty_replace read `where id=1`) are
-- re-scoped to current_shop() in phase5/5h_rpc_tenant_scoping.sql.
-- ============================================================================

alter table public.shop_config drop constraint if exists shop_config_singleton;

create sequence if not exists public.shop_config_id_seq owned by public.shop_config.id;
select setval('public.shop_config_id_seq', greatest((select coalesce(max(id),1) from public.shop_config), 1));
alter table public.shop_config alter column id set default nextval('public.shop_config_id_seq');
grant usage, select on sequence public.shop_config_id_seq to authenticated, service_role;

create unique index if not exists shop_config_one_per_shop on public.shop_config(shop_id);
alter table public.shop_config alter column shop_id set not null;
