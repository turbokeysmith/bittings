-- ============================================================================
-- Phase 5 · 5e — per-shop Stripe Connect status on the tenant root (shops)
-- ----------------------------------------------------------------------------
-- Each shop connects its OWN Stripe (Express) connected account; customer card
-- charges route to that account (destination charge) with a 1% platform
-- application fee, and the connected shop bears Stripe's processing fee
-- (on_behalf_of). This migration adds the per-shop connect state to `shops`.
--
-- SECURITY: the connect_* flags are the gate for whether a shop may take card
-- payments, so they must NOT be client-writable. Only service_role (the
-- connect-onboard function + the account.updated webhook) writes them. Owners
-- keep the ability to RENAME their shop via a column-level UPDATE grant on
-- `name` only — they cannot flip connect_charges_enabled without real onboarding.
--
-- Supersedes the old scaffold that stored stripe_connect_id on `subscriptions`
-- and was not shop-scoped. Applied live via mcp apply_migration
-- (phase5_5e_shop_connect_fields), 2026-07-01. Idempotent. Depends on: 5a, 5c.
-- ============================================================================

alter table public.shops
  add column if not exists stripe_connect_id        text,
  add column if not exists connect_charges_enabled  boolean not null default false,
  add column if not exists connect_payouts_enabled  boolean not null default false,
  add column if not exists connect_onboarded_at      timestamptz;

revoke update on public.shops from authenticated;
grant  update(name) on public.shops to authenticated;   -- owners may rename their shop only
grant  select, update on public.shops to service_role;  -- 5c granted select; add update for connect status
