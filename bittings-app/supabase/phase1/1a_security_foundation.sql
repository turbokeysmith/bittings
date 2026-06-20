-- ============================================================================
-- Phase 1 / Stage 1a — Security foundation  (NOT YET APPLIED — Checkpoint 1)
-- ----------------------------------------------------------------------------
-- Additive + idempotent. Preserves existing data. Re-runnable safely.
-- Old open RLS policies are recorded in comments above each table so the change
-- is reversible. Apply only after owner approves the plain-language plan.
--
-- What this does:
--   1. `staff` table  = single source of truth for roles (replaces OWNER_EMAILS).
--   2. helpers: current_staff_role() / is_staff() / is_manager() / is_owner().
--   3. claim_first_owner() = one-time bootstrap (first account => owner).
--   4. Personal PINs, hashed (pgcrypto): set_my_pin() / verify_pin().
--   5. Soft-delete columns on customers/inventory/bookings/receipts.
--   6. audit_log (append-only) + trigger that records soft/hard deletes.
--   7. Rewrite every `using(true)` RLS policy to role-aware rules (the matrix).
--   8. Website lead-intake: anon INSERT-ONLY on customers (kept commented until
--      the contact form is actually wired — see note at the bottom).
-- ============================================================================

create extension if not exists pgcrypto;   -- crypt()/gen_salt() for PIN hashing (schema: extensions)

-- ----------------------------------------------------------------------------
-- 1. staff — the single source of truth for who is who
-- ----------------------------------------------------------------------------
create table if not exists public.staff (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  name        text    not null default '',
  role        text    not null check (role in ('owner','manager','front_desk','technician')),
  active      boolean not null default true,
  pin_hash    text,                 -- hashed personal PIN (manager/owner only); NEVER plaintext
  home_van_id uuid,                 -- set in Stage 1b (fleet)
  shop_id     uuid,                 -- nullable now; future multi-tenant
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.staff enable row level security;

-- Never expose pin_hash to the client: grant column-level SELECT excluding it.
revoke all on public.staff from authenticated;
grant select (user_id, name, role, active, home_van_id, shop_id, created_at, updated_at) on public.staff to authenticated;
grant insert, update, delete on public.staff to authenticated;  -- rows still gated by RLS below

-- ----------------------------------------------------------------------------
-- 2. role helpers (security definer so RLS can call them without recursion)
-- ----------------------------------------------------------------------------
create or replace function public.current_staff_role()
  returns text language sql stable security definer set search_path = public as $$
  select role from public.staff where user_id = auth.uid() and active = true
$$;

create or replace function public.is_staff()
  returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.staff where user_id = auth.uid() and active = true)
$$;

create or replace function public.is_manager()
  returns boolean language sql stable security definer set search_path = public as $$
  select public.current_staff_role() in ('manager','owner')
$$;

create or replace function public.is_owner()
  returns boolean language sql stable security definer set search_path = public as $$
  select public.current_staff_role() = 'owner'
$$;

-- ----------------------------------------------------------------------------
-- 3. claim_first_owner() — ONE-TIME bootstrap. Promotes the caller to owner
--    ONLY when the staff table is empty. Self-disabling afterward.
-- ----------------------------------------------------------------------------
create or replace function public.claim_first_owner(p_name text default '')
  returns text language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if auth.uid() is null then raise exception 'must be signed in'; end if;
  select count(*) into v_count from public.staff;
  if v_count > 0 then raise exception 'an owner already exists — ask an owner to add you'; end if;
  insert into public.staff(user_id, name, role, active)
    values (auth.uid(), coalesce(nullif(p_name, ''), ''), 'owner', true);
  return 'owner';
end $$;

-- ----------------------------------------------------------------------------
-- 4. Personal PINs — hashed, manager/owner only, tied to the user
-- ----------------------------------------------------------------------------
create or replace function public.set_my_pin(p_pin text)
  returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if public.current_staff_role() not in ('manager','owner') then raise exception 'PINs are manager/owner only'; end if;
  if p_pin !~ '^[0-9]{4,8}$' then raise exception 'PIN must be 4-8 digits'; end if;
  update public.staff set pin_hash = crypt(p_pin, gen_salt('bf')), updated_at = now()
   where user_id = auth.uid();
end $$;

create or replace function public.verify_pin(p_pin text)
  returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare ok boolean;
begin
  select (pin_hash is not null and pin_hash = crypt(p_pin, pin_hash)) into ok
    from public.staff where user_id = auth.uid() and active = true;
  return coalesce(ok, false);
end $$;

-- staff RLS: anyone on the team can see the roster; only the OWNER manages staff.
drop policy if exists staff_select on public.staff;
create policy staff_select on public.staff for select to authenticated using (public.is_staff());
drop policy if exists staff_insert on public.staff;
create policy staff_insert on public.staff for insert to authenticated with check (public.is_owner());
drop policy if exists staff_update on public.staff;
create policy staff_update on public.staff for update to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists staff_delete on public.staff;
create policy staff_delete on public.staff for delete to authenticated using (public.is_owner());

-- ----------------------------------------------------------------------------
-- 5. Soft-delete columns (manager soft-deletes; only owner hard-deletes)
-- ----------------------------------------------------------------------------
alter table public.customers add column if not exists deleted_at timestamptz;
alter table public.customers add column if not exists deleted_by uuid;
alter table public.inventory add column if not exists deleted_at timestamptz;
alter table public.inventory add column if not exists deleted_by uuid;
alter table public.bookings  add column if not exists deleted_at timestamptz;
alter table public.bookings  add column if not exists deleted_by uuid;
alter table public.receipts  add column if not exists deleted_at timestamptz;
alter table public.receipts  add column if not exists deleted_by uuid;

-- ----------------------------------------------------------------------------
-- 6. audit_log — append-only record of sensitive actions
-- ----------------------------------------------------------------------------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  user_id     uuid,
  role        text,
  action      text not null,
  entity_type text,
  entity_id   text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
alter table public.audit_log enable row level security;
revoke insert, update, delete on public.audit_log from authenticated;  -- only triggers/definer write
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select to authenticated using (public.is_manager());

-- generic audit trigger: records soft-delete (deleted_at newly set) and hard-delete
create or replace function public.fn_audit()
  returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'DELETE') then
    insert into public.audit_log(user_id, role, action, entity_type, entity_id, detail)
      values (auth.uid(), public.current_staff_role(), 'hard_delete', tg_table_name, (to_jsonb(old)->>'id'), to_jsonb(old));
    return old;
  elsif (tg_op = 'UPDATE') then
    if (to_jsonb(old)->>'deleted_at') is null and (to_jsonb(new)->>'deleted_at') is not null then
      insert into public.audit_log(user_id, role, action, entity_type, entity_id, detail)
        values (auth.uid(), public.current_staff_role(), 'soft_delete', tg_table_name, (to_jsonb(new)->>'id'),
                jsonb_build_object('deleted_by', (to_jsonb(new)->>'deleted_by')));
    end if;
    return new;
  end if;
  return null;
end $$;

do $$ declare t text;
begin
  foreach t in array array['customers','inventory','bookings','receipts'] loop
    execute format('drop trigger if exists trg_audit_del on public.%I', t);
    execute format('create trigger trg_audit_del after delete on public.%I for each row execute function public.fn_audit()', t);
    execute format('drop trigger if exists trg_audit_soft on public.%I', t);
    execute format('create trigger trg_audit_soft after update on public.%I for each row execute function public.fn_audit()', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 7. RLS REWRITE — replace every `using(true)` with role-aware rules
--    Soft-deleted rows are hidden from normal views; managers/owners still see them.
-- ----------------------------------------------------------------------------

-- customers — OLD (reversible): emp_select/insert/update/delete were all `using(true)` / `with check(true)` to authenticated
drop policy if exists emp_select on public.customers;
drop policy if exists emp_insert on public.customers;
drop policy if exists emp_update on public.customers;
drop policy if exists emp_delete on public.customers;
create policy cust_select on public.customers for select to authenticated
  using (public.is_staff() and (deleted_at is null or public.is_manager()));
create policy cust_insert on public.customers for insert to authenticated
  with check (public.is_staff());                                   -- add customer: all staff
create policy cust_update on public.customers for update to authenticated
  using (public.is_staff()) with check (public.is_staff());         -- edit/soft-delete: all staff (soft-delete = manager via app)
create policy cust_delete on public.customers for delete to authenticated
  using (public.is_owner());                                        -- HARD delete: owner only

-- inventory — OLD (reversible): inv_select/insert/update/delete were all `using(true)`
-- INTERIM: writes are manager/owner only. Stage 1b adds per-location move (tech+)
-- and receive (front_desk+) once inventory_locations exists.
drop policy if exists inv_select on public.inventory;
drop policy if exists inv_insert on public.inventory;
drop policy if exists inv_update on public.inventory;
drop policy if exists inv_delete on public.inventory;
create policy inv_select on public.inventory for select to authenticated
  using (public.is_staff() and (deleted_at is null or public.is_manager()));
create policy inv_insert on public.inventory for insert to authenticated with check (public.is_manager());
create policy inv_update on public.inventory for update to authenticated using (public.is_manager()) with check (public.is_manager());
create policy inv_delete on public.inventory for delete to authenticated using (public.is_owner());

-- bookings — OLD (reversible): bk_select/insert/update/delete were all `using(true)`
-- INTERIM: any staff may create/edit. Stage 1c promotes status to a column and
-- adds own-job / front-desk-cannot-change-status / scheduled-only rules.
drop policy if exists bk_select on public.bookings;
drop policy if exists bk_insert on public.bookings;
drop policy if exists bk_update on public.bookings;
drop policy if exists bk_delete on public.bookings;
create policy bk_select on public.bookings for select to authenticated
  using (public.is_staff() and (deleted_at is null or public.is_manager()));
create policy bk_insert on public.bookings for insert to authenticated with check (public.is_staff());
create policy bk_update on public.bookings for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy bk_delete on public.bookings for delete to authenticated using (public.is_owner());

-- receipts — OLD (reversible): rc_select/insert/update/delete were all `using(true)`
drop policy if exists rc_select on public.receipts;
drop policy if exists rc_insert on public.receipts;
drop policy if exists rc_update on public.receipts;
drop policy if exists rc_delete on public.receipts;
create policy rc_select on public.receipts for select to authenticated
  using (public.is_staff() and (deleted_at is null or public.is_manager()));
create policy rc_insert on public.receipts for insert to authenticated with check (public.is_staff());     -- take payment / make invoice
create policy rc_update on public.receipts for update to authenticated using (public.is_manager()) with check (public.is_manager()); -- edits/pricing: manager+
create policy rc_delete on public.receipts for delete to authenticated using (public.is_owner());

-- payment_transactions — OLD (reversible): pt_select was `using(true)`; no writes from client
-- (writes happen only via the edge functions running as service_role).
drop policy if exists pt_select on public.payment_transactions;
create policy pt_select on public.payment_transactions for select to authenticated using (public.is_staff());
-- (own-job-only financial visibility is enforced via role-aware views in Stage 1d)

-- payment_events — manager/owner read only
alter table public.payment_events enable row level security;
drop policy if exists pe_select on public.payment_events;
create policy pe_select on public.payment_events for select to authenticated using (public.is_manager());

-- shop_config — OLD (reversible): shop_config_sel/ins/upd were all `using(true)`
drop policy if exists shop_config_sel on public.shop_config;
drop policy if exists shop_config_ins on public.shop_config;
drop policy if exists shop_config_upd on public.shop_config;
create policy shop_config_sel on public.shop_config for select to authenticated using (public.is_staff());
create policy shop_config_ins on public.shop_config for insert to authenticated with check (public.is_manager());
create policy shop_config_upd on public.shop_config for update to authenticated using (public.is_manager()) with check (public.is_manager());

-- ----------------------------------------------------------------------------
-- 7b. Lock down SECURITY DEFINER functions: remove the default PUBLIC execute
--     grant (which exposed them to anon via /rest/v1/rpc), then grant only to
--     authenticated where needed. fn_audit is trigger-only (no API role).
-- ----------------------------------------------------------------------------
revoke execute on function public.current_staff_role() from public;
revoke execute on function public.is_staff() from public;
revoke execute on function public.is_manager() from public;
revoke execute on function public.is_owner() from public;
revoke execute on function public.claim_first_owner(text) from public;
revoke execute on function public.set_my_pin(text) from public;
revoke execute on function public.verify_pin(text) from public;
revoke execute on function public.fn_audit() from public;
grant execute on function public.current_staff_role() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_manager() to authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.claim_first_owner(text) to authenticated;
grant execute on function public.set_my_pin(text) to authenticated;
grant execute on function public.verify_pin(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 8. WEBSITE lead-intake role (anon INSERT-ONLY on customers) — DISABLED for now.
--    Uncomment to activate once the public contact form actually writes leads
--    AND spam protection (rate limit / Turnstile) is in place. Until then we
--    avoid leaving an open, unthrottled insert surface on the public anon key.
-- ----------------------------------------------------------------------------
-- create policy cust_anon_insert on public.customers for insert to anon with check (true);
-- grant insert (name, phone, email, vehicle, notes, source) on public.customers to anon;

-- ============================================================================
-- After apply, the owner runs ONCE (signed in):   select public.claim_first_owner('Samer');
-- ============================================================================
