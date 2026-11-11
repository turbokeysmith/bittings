-- 8z37 — Card payments become DIRECT charges on the shop's own Stripe account
-- (owner decision 2026-11-11). Before: destination charges on the platform account, so
-- Stripe billed its processing fee to Bittings. Now: the PaymentIntent, the Terminal
-- Location and the readers all live on the shop's connected account; Stripe bills the
-- shop its processing fee and Bittings only receives its application fee.
--
-- payment_transactions.charge_type tells refund / status / cancel which account a
-- PaymentIntent lives on: 'destination' = platform account (every row before today),
-- 'direct' = the row's connected_account_id.

alter table public.payment_transactions
  add column if not exists charge_type text not null default 'destination'
  check (charge_type in ('destination','direct'));

-- Terminal Locations created so far are on the PLATFORM account and can't be used for
-- direct charges. Forget them; the next "Add a reader" creates the shop's location on its
-- own account (readers are re-paired once).
update public.shops set terminal_location_id = null where terminal_location_id is not null;

-- Turbo Keysmith's half-finished TEST onboarding was a legacy Express account. Forget it
-- so the next "Connect your Stripe account" creates the new account type (shop pays Stripe
-- directly). Only cleared while it is still not charge-enabled.
update public.shops
   set stripe_connect_id = null, connect_charges_enabled = false, connect_payouts_enabled = false, connect_onboarded_at = null
 where name = 'Turbo Keysmith LLC' and coalesce(connect_charges_enabled, false) = false;
