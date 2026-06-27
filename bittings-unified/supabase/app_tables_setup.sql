-- ============================================================
-- Turbo Keysmith — app tables: inventory, bookings, receipts
-- Companion to customers_setup.sql (the customers table already
-- exists there; this file adds the rest).
-- HOW TO USE: Supabase dashboard -> SQL Editor -> New query ->
-- paste this whole block -> Run. Safe to run more than once.
--
-- The front-end data layer (app/store.js -> CloudAdapter) maps to
-- these tables. Customer name is stored in customers.name (the JS
-- object calls it `customer`); contracting/NASTF accounts are the
-- same customers table with is_contracting = true.
-- ============================================================

-- Keep updated_at fresh (re-declared here so this file runs standalone).
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------
-- INVENTORY  (parts & stock)  — id is the app's text id
-- ---------------------------------------------------------------
create table if not exists public.inventory (
  id           text primary key,
  name         text not null,
  sku          text default '',
  category     text default '',
  qty          integer default 0,
  low_at       integer default 0,          -- low-stock threshold
  unit         text default '',
  cost         numeric default 0,
  location     text default '',
  notes        text default '',
  supplier     text default '',            -- NEW
  reorder_qty  integer default 0,          -- NEW (how many to reorder)
  fitment      text default '',            -- NEW (what vehicles/VIN a key/fob fits)
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
-- additive for projects created before `fitment` existed
alter table public.inventory add column if not exists fitment text default '';
alter table public.inventory enable row level security;
drop policy if exists "inv_select" on public.inventory;
drop policy if exists "inv_insert" on public.inventory;
drop policy if exists "inv_update" on public.inventory;
drop policy if exists "inv_delete" on public.inventory;
create policy "inv_select" on public.inventory for select to authenticated using (true);
create policy "inv_insert" on public.inventory for insert to authenticated with check (true);
create policy "inv_update" on public.inventory for update to authenticated using (true) with check (true);
create policy "inv_delete" on public.inventory for delete to authenticated using (true);
grant select, insert, update, delete on public.inventory to authenticated;
drop trigger if exists inventory_touch on public.inventory;
create trigger inventory_touch before update on public.inventory
  for each row execute function public.touch_updated_at();
create index if not exists inventory_lowstock_idx on public.inventory ((qty <= low_at));

-- ---------------------------------------------------------------
-- BOOKINGS  (scheduler jobs) — full nested record kept in `data`
-- ---------------------------------------------------------------
create table if not exists public.bookings (
  id            text primary key,
  data          jsonb not null,            -- the whole booking object
  date          text,                      -- pulled out for day-view queries
  time          text,
  customer_name text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table public.bookings enable row level security;
drop policy if exists "bk_select" on public.bookings;
drop policy if exists "bk_insert" on public.bookings;
drop policy if exists "bk_update" on public.bookings;
drop policy if exists "bk_delete" on public.bookings;
create policy "bk_select" on public.bookings for select to authenticated using (true);
create policy "bk_insert" on public.bookings for insert to authenticated with check (true);
create policy "bk_update" on public.bookings for update to authenticated using (true) with check (true);
create policy "bk_delete" on public.bookings for delete to authenticated using (true);
grant select, insert, update, delete on public.bookings to authenticated;
drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();
create index if not exists bookings_date_idx on public.bookings (date);

-- ---------------------------------------------------------------
-- RECEIPTS  (invoices / NASTF paperwork) — full record in `data`
-- ---------------------------------------------------------------
create table if not exists public.receipts (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table public.receipts enable row level security;
drop policy if exists "rc_select" on public.receipts;
drop policy if exists "rc_insert" on public.receipts;
drop policy if exists "rc_update" on public.receipts;
drop policy if exists "rc_delete" on public.receipts;
create policy "rc_select" on public.receipts for select to authenticated using (true);
create policy "rc_insert" on public.receipts for insert to authenticated with check (true);
create policy "rc_update" on public.receipts for update to authenticated using (true) with check (true);
create policy "rc_delete" on public.receipts for delete to authenticated using (true);
grant select, insert, update, delete on public.receipts to authenticated;
drop trigger if exists receipts_touch on public.receipts;
create trigger receipts_touch before update on public.receipts
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------
-- CUSTOMERS — extra columns used by the public contact form so a
-- lead's details + Spanish-form marker survive a cloud round-trip.
-- (The customers table itself is created in customers_setup.sql.)
-- ---------------------------------------------------------------
alter table public.customers add column if not exists service_needed text default '';
alter table public.customers add column if not exists notes          text default '';
alter table public.customers add column if not exists lang           text default '';  -- 'es' = Spanish-form lead
alter table public.customers add column if not exists source         text default '';  -- e.g. website-contact / scheduler

-- ============================================================
-- Done. The CloudAdapter stays OFF until you call
-- TKS.connectCloud({ url, anonKey }) in the app.
-- ============================================================
