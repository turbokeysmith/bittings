-- ============================================================
-- Turbo Keysmith — Portal payments (single-shop, Stripe direct charges)
-- Companion to the pay-* Supabase Edge Functions. Amounts are INTEGER CENTS.
-- org_id / connected_account_id are nullable now (single-account) and carry
-- forward unchanged to a future multi-tenant / Stripe Connect build.
-- HOW TO USE: Supabase SQL Editor -> paste -> Run. Safe to run more than once.
-- ============================================================

create table if not exists public.payment_transactions (
  id                       uuid primary key default gen_random_uuid(),
  invoice_id               text,                         -- receipts.id being paid
  org_id                   text,                         -- null = single-shop (future multi-tenant)
  connected_account_id     text,                         -- null = single-account direct (future Connect)
  method                   text not null,                -- 'reader' | 'keyed' | 'cash' | 'check'
  currency                 text not null default 'usd',
  base_cents               integer not null,             -- authoritative invoice base (pre-surcharge)
  surcharge_cents          integer not null default 0,   -- 2% of base (authorized on top; credit-only)
  authorized_cents         integer not null,             -- base + surcharge (what we authorize)
  captured_cents           integer,                      -- final captured (base, or base+surcharge if credit)
  surcharge_applied        boolean not null default false,
  card_funding             text,                         -- credit | debit | prepaid | unknown
  card_brand               text,
  reader_id                text,
  stripe_payment_intent_id text unique,
  stripe_refund_id         text,                         -- last refund id (see refunded_cents for the running total)
  refunded_cents           integer not null default 0,   -- running total actually refunded (partial-refund aware; see phase5/5d)
  status                   text not null default 'pending', -- pending|authorized|completed|partially_refunded|failed|canceled|refunded
  failure_reason           text,
  idempotency_key          text,                         -- inv_<id>_attempt_<n> (card) | inv_<id>_<method> (cash/check)
  description              text,                         -- human label for the day-closeout history
  cost_cents               integer,                      -- COGS (parts) for this sale; null/0 = unknown. profit = sales - coalesce(cost_cents,0)
  technician               text,                         -- tech/employee attributed (per-tech totals + commission); null = unattributed
  tax_cents                integer,                      -- sales tax collected (pass-through). Sales = base_cents - coalesce(tax_cents,0)
  created_by               uuid,                         -- auth.uid of the cashier
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists pt_pi_idx      on public.payment_transactions (stripe_payment_intent_id);
create index if not exists pt_invoice_idx on public.payment_transactions (invoice_id);
create unique index if not exists pt_idem_idx on public.payment_transactions (idempotency_key) where idempotency_key is not null;
create index if not exists pt_technician_idx on public.payment_transactions (technician) where technician is not null;

-- Cloud-synced owner config (single row id=1). Today: sales-tax settings — a
-- default rate (percent) and which line categories are taxable. The app reads/
-- writes it (owner-gated in UI); receipts snapshot their own rate (override).
create table if not exists public.shop_config (
  id                 int primary key default 1,
  tax_rate           numeric not null default 0,            -- percent, e.g. 8.625
  taxable_categories jsonb   not null default '{}'::jsonb,  -- {category: bool} overrides
  data               jsonb   not null default '{}'::jsonb,  -- FULL owner/onboarding config (identity, payments, access, vendors, services, hours, footer, setup progress) — Setup wizard source of truth
  updated_by         uuid,
  updated_at         timestamptz not null default now(),
  constraint shop_config_singleton check (id = 1)
);
alter table public.shop_config enable row level security;
drop policy if exists shop_config_sel on public.shop_config;
drop policy if exists shop_config_ins on public.shop_config;
drop policy if exists shop_config_upd on public.shop_config;
create policy shop_config_sel on public.shop_config for select to authenticated using (true);
create policy shop_config_ins on public.shop_config for insert to authenticated with check (true);
create policy shop_config_upd on public.shop_config for update to authenticated using (true) with check (true);
grant select, insert, update on public.shop_config to authenticated, service_role;

-- Verified-webhook sink: audit trail + event idempotency (PK = stripe event id).
create table if not exists public.payment_events (
  id                text primary key,                    -- evt_... (idempotent)
  type              text,
  payment_intent_id text,
  payload           jsonb,
  received_at       timestamptz not null default now()
);

alter table public.payment_transactions enable row level security;
alter table public.payment_events       enable row level security;

-- Signed-in staff may READ transactions; ALL writes go through edge functions
-- (service role, which bypasses RLS). No write policies for `authenticated`.
drop policy if exists pt_select on public.payment_transactions;
create policy pt_select on public.payment_transactions for select to authenticated using (true);
grant select on public.payment_transactions to authenticated;
-- payment_events has NO authenticated policies -> service role only.

drop trigger if exists payment_transactions_touch on public.payment_transactions;
create trigger payment_transactions_touch before update on public.payment_transactions
  for each row execute function public.touch_updated_at();

-- IMPORTANT: the edge functions run as service_role. This project did not grant
-- DML to service_role by default, so grant it explicitly (without this the
-- functions get "permission denied"). service_role bypasses RLS.
grant select on public.receipts                to service_role;   -- read authoritative invoice total
grant select, insert, update on public.payment_transactions to service_role;
grant select, insert on public.payment_events  to service_role;
