-- ============================================================
-- Turbo Keysmith — Customers table (shared, cloud-synced)
-- HOW TO USE: Supabase dashboard -> SQL Editor -> New query ->
-- paste this whole block -> Run. Safe to run once.
-- ============================================================

create table if not exists public.customers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  contact        text default '',
  phone          text default '',
  email          text default '',
  address        text default '',
  customer_type  text default 'individual',  -- 'individual' | 'business'
  is_contracting boolean default false,       -- NASTF contracting accounts
  service_needed text default '',             -- lead's chosen service (fixed English value)
  notes          text default '',             -- free text from the contact form (stored as typed)
  lang           text default '',             -- 'es' = lead came through the Spanish form (ES badge)
  source         text default '',             -- e.g. website-contact / scheduler / staff
  last_used      timestamptz default now(),
  created_by     uuid default auth.uid(),     -- who first added them
  updated_by     uuid default auth.uid(),     -- who last edited them
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- Additive for projects created before these lead columns existed (safe to re-run).
-- The public contact form (EN + ES) writes these through TKS, so they must exist
-- for a website lead's service type, notes, and Spanish "ES" marker to sync.
alter table public.customers add column if not exists service_needed text default '';
alter table public.customers add column if not exists notes          text default '';
alter table public.customers add column if not exists lang           text default '';
alter table public.customers add column if not exists source         text default '';

-- Lock the table: nothing in or out until a rule below allows it.
alter table public.customers enable row level security;

-- One shared customer list for any logged-in employee.
drop policy if exists "emp_select" on public.customers;
drop policy if exists "emp_insert" on public.customers;
drop policy if exists "emp_update" on public.customers;
drop policy if exists "emp_delete" on public.customers;
create policy "emp_select" on public.customers for select to authenticated using (true);
create policy "emp_insert" on public.customers for insert to authenticated with check (true);
create policy "emp_update" on public.customers for update to authenticated using (true) with check (true);
create policy "emp_delete" on public.customers for delete to authenticated using (true);

-- Newer Supabase projects need this explicit grant for the API to see the table.
grant select, insert, update, delete on public.customers to authenticated;

-- Keep updated_at fresh on every edit.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
-- Pin search_path (security-advisor 0011); now() resolves from pg_catalog anyway.
alter function public.touch_updated_at() set search_path = '';
drop trigger if exists customers_touch on public.customers;
create trigger customers_touch before update on public.customers
  for each row execute function public.touch_updated_at();
