-- ============================================================================
-- Phase 5 · 5a — TRUE MULTI-TENANCY (shops + shop_members + per-shop isolation)
-- ----------------------------------------------------------------------------
-- Each business = a shop. Every shop-owned table gets shop_id, and a RESTRICTIVE
-- RLS policy (`shop_id = current_shop()`) is AND-ed UNDER the existing role
-- policies — so the owner/manager/front_desk/tech rules keep working but now
-- ONLY within the caller's own shop. A user can never see/query/modify another
-- shop's data.  Existing single-shop data is migrated into one shop ("Turbo
-- Keysmith") so nothing breaks.
--
-- Why RESTRICTIVE: multiple PERMISSIVE policies on a table are OR-ed; a
-- RESTRICTIVE policy is AND-ed with all of them. So we DON'T rewrite the dozens
-- of existing role policies — we add one tenant fence per table that every read
-- and write must also satisfy.  (See SECURITY_AUDIT_PHASE4.md for the why.)
--
-- Depends on: phase1/1a (staff, is_staff/is_manager/is_owner), phase4 (subscriptions).
-- Apply AFTER all phase1-4 SQL. Idempotent. Run in the Supabase SQL editor.
-- ============================================================================

-- 1) Tenant root tables ------------------------------------------------------
create table if not exists public.shops (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.shop_members (
  shop_id    uuid not null references public.shops(id) on delete cascade,
  user_id    uuid not null,
  role       text not null default 'technician'
               check (role in ('owner','manager','front_desk','technician')),
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (shop_id, user_id)
);
alter table public.shops        enable row level security;
alter table public.shop_members enable row level security;

-- 2) current_shop() — the caller's shop (membership table is the authority). --
create or replace function public.current_shop()
  returns uuid language sql stable security definer set search_path = public as $$
  select shop_id from public.shop_members
   where user_id = auth.uid() and active = true
   order by created_at limit 1
$$;
grant execute on function public.current_shop() to authenticated;

-- Role lookups become shop-scoped (a user has one membership; keeps roles
-- correct even if a user were ever added to two shops). shop_members is the
-- security authority; staff stays the app-facing roster (name/pin/home_van).
create or replace function public.current_staff_role()
  returns text language sql stable security definer set search_path = public as $$
  select role from public.shop_members
   where user_id = auth.uid() and active = true and shop_id = public.current_shop()
   limit 1
$$;
-- is_staff/is_manager/is_owner (from 1a) call current_staff_role()/staff; redefine
-- is_staff to membership so it's shop-aware too.
create or replace function public.is_staff()
  returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.shop_members
                 where user_id = auth.uid() and active = true)
$$;

-- 3) Keep shop_members in sync with the app's staff roster (one source the app
--    writes; security reads membership). Mirrors role/active/shop on staff change.
create or replace function public.sync_staff_member()
  returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.user_id is not null and NEW.shop_id is not null then
    insert into public.shop_members(shop_id, user_id, role, active)
      values (NEW.shop_id, NEW.user_id, NEW.role, coalesce(NEW.active, true))
    on conflict (shop_id, user_id) do update
      set role = excluded.role, active = excluded.active;
  end if;
  return NEW;
end $$;
drop trigger if exists trg_staff_member on public.staff;
create trigger trg_staff_member after insert or update on public.staff
  for each row execute function public.sync_staff_member();

-- 4) Migrate the existing single shop ----------------------------------------
do $$
declare v_shop uuid;
begin
  if not exists (select 1 from public.shops) then
    insert into public.shops(name) values ('Turbo Keysmith') returning id into v_shop;
    insert into public.shop_members(shop_id, user_id, role, active)
      select v_shop, user_id, role, coalesce(active,true)
        from public.staff where user_id is not null
      on conflict (shop_id, user_id) do nothing;
    update public.staff set shop_id = v_shop where shop_id is null;
  end if;
end $$;

-- 5) shop_id + restrictive isolation on every shop-owned table ---------------
do $$
declare t text;
  tabs text[] := array[
    'customers','inventory','inventory_locations','bookings','receipts','vans',
    'staff','job_staff','job_parts','commission_config','services','move_requests',
    'payment_transactions','payment_events','audit_log','shop_config'];
  v_shop uuid := (select id from public.shops order by created_at limit 1);
begin
  foreach t in array tabs loop
    execute format('alter table public.%I add column if not exists shop_id uuid', t);
    execute format('update public.%I set shop_id = %L where shop_id is null', t, v_shop);
    execute format('alter table public.%I alter column shop_id set default public.current_shop()', t);
    execute format('create index if not exists %I on public.%I(shop_id)', t||'_shop_idx', t);
    execute format('drop policy if exists %I on public.%I', t||'_tenant', t);
    execute format($f$create policy %I on public.%I as restrictive for all to authenticated
      using (shop_id = public.current_shop()) with check (shop_id = public.current_shop())$f$, t||'_tenant', t);
  end loop;
end $$;

-- subscriptions already has shop_id (phase4) but seeded with a random id — align
-- it to the real shop and add the tenant fence + correct default.
update public.subscriptions
   set shop_id = (select id from public.shops order by created_at limit 1)
 where shop_id is not null
   and shop_id not in (select id from public.shops);
alter table public.subscriptions alter column shop_id set default public.current_shop();
drop policy if exists subscriptions_tenant on public.subscriptions;
create policy subscriptions_tenant on public.subscriptions as restrictive for all to authenticated
  using (shop_id = public.current_shop()) with check (shop_id = public.current_shop());

-- 6) RLS for the tenant-root tables (a user sees ONLY their shop + its members;
--    only the shop owner manages membership — role layered within the shop).
drop policy if exists shops_select on public.shops;
create policy shops_select on public.shops for select to authenticated
  using (id = public.current_shop());
drop policy if exists shops_update on public.shops;
create policy shops_update on public.shops for update to authenticated
  using (id = public.current_shop() and public.is_owner())
  with check (id = public.current_shop() and public.is_owner());

drop policy if exists sm_select on public.shop_members;
create policy sm_select on public.shop_members for select to authenticated
  using (shop_id = public.current_shop());
drop policy if exists sm_write on public.shop_members;
create policy sm_write on public.shop_members for all to authenticated
  using (shop_id = public.current_shop() and public.is_owner())
  with check (shop_id = public.current_shop() and public.is_owner());

grant select on public.shops, public.shop_members to authenticated;
grant insert, update, delete on public.shop_members to authenticated;
grant select, insert, update on public.shops to authenticated;

-- 7) Onboarding — a new pilot shop gets its own isolated space ----------------
--    The signed-in user becomes owner of a brand-new shop (one shop per user for
--    the pilot). Wired into the app's first-run/onboarding (claim path).
create or replace function public.create_shop(p_name text)
  returns uuid language plpgsql security definer set search_path = public as $$
declare v_shop uuid;
begin
  if auth.uid() is null then raise exception 'must be signed in'; end if;
  if exists (select 1 from public.shop_members where user_id = auth.uid() and active) then
    return public.current_shop();                      -- already has a shop
  end if;
  insert into public.shops(name) values (coalesce(nullif(p_name,''),'My Shop')) returning id into v_shop;
  insert into public.shop_members(shop_id, user_id, role, active) values (v_shop, auth.uid(), 'owner', true);
  insert into public.staff(user_id, name, role, active, shop_id)
    values (auth.uid(), '', 'owner', true, v_shop)
  on conflict (user_id) do update set shop_id = excluded.shop_id, role = 'owner', active = true;
  return v_shop;
end $$;
grant execute on function public.create_shop(text) to authenticated;

-- claim_first_owner() (1a) is single-shop-only; create_shop() is the multi-tenant
-- onboarding path. Leave claim_first_owner in place but the app now calls create_shop.

-- 8) NOTE — service_role (edge functions) bypasses RLS. After this, the payment
--    edge functions must stamp shop_id on payment_transactions/events and only
--    act on rows where receipt.shop_id = the caller's shop. Tracked in the audit;
--    do it as a follow-up so the live charge path isn't changed in this migration.
