-- ============================================================================
-- Phase 8z13 (2026-11-09) — each shop pairs its OWN card reader during setup
-- ----------------------------------------------------------------------------
-- Card charges are destination charges created on the PLATFORM Stripe account
-- (on_behalf_of + transfer_data → the shop's Connect account), so readers must be
-- registered on the platform too. Each shop gets its own Stripe Terminal Location
-- (created by pay-terminal on the first "Add a reader"); a shop only ever sees,
-- uses or removes readers at ITS location. Written by the edge function only
-- (service role) — never from the browser.
-- Rollback: alter table public.shops drop column terminal_location_id;
-- ============================================================================
alter table public.shops add column if not exists terminal_location_id text;
comment on column public.shops.terminal_location_id is 'Stripe Terminal location (platform account) for this shop''s card readers — set by pay-terminal';
