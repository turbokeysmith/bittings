-- Phase 4 · 4b — billing/Connect columns on subscriptions (apply after 4a).
alter table public.subscriptions add column if not exists stripe_connect_id text;
-- (tier/status/stripe_customer_id/stripe_subscription_id/current_period_end already in 4a.)
-- Writers stay service_role-only (the Stripe webhook); clients still only READ their tier.
