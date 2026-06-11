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
  method                   text not null,                -- 'reader' | 'keyed'
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
  stripe_refund_id         text,
  status                   text not null default 'pending', -- pending|authorized|completed|failed|canceled|refunded
  failure_reason           text,
  idempotency_key          text,                         -- inv_<id>_attempt_<n>
  created_by               uuid,                         -- auth.uid of the cashier
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists pt_pi_idx      on public.payment_transactions (stripe_payment_intent_id);
create index if not exists pt_invoice_idx on public.payment_transactions (invoice_id);
create unique index if not exists pt_idem_idx on public.payment_transactions (idempotency_key) where idempotency_key is not null;

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
