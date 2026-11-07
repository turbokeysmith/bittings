-- ============================================================================
-- Phase 8d — registered shop workstations: PIN session-SWITCH only on a trusted device
-- ----------------------------------------------------------------------------
-- Owner decision 2026-11-07 ("shop PC only"): a 6-digit manager PIN typed into the lock screen
-- used to switch the session to that manager on ANY signed-in device (a tech's phone included) —
-- a shoulder-surfed PIN was a full manager login. Now:
--   • unlocking YOUR OWN screen with your own PIN still works everywhere;
--   • switching to a DIFFERENT teammate requires the device to present a registration token
--     that a manager/owner minted on that machine (Settings → Time clock → "this device is a
--     shop workstation"). Phones never get one unless a manager registers them on purpose.
-- The token is shown to the browser once and stored only hashed (bcrypt) here.
-- Apply: supabase db query --file … --linked --yes
-- ============================================================================
create extension if not exists pgcrypto;

create table if not exists public.shop_devices (
  id             uuid primary key default gen_random_uuid(),
  shop_id        uuid not null default public.current_shop() references public.shops(id) on delete cascade,
  name           text not null default 'Shop workstation',
  token_hash     text not null,
  registered_by  uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  last_seen_at   timestamptz,
  revoked_at     timestamptz
);
alter table public.shop_devices enable row level security;
drop policy if exists sd_sel on public.shop_devices;
create policy sd_sel on public.shop_devices for select to authenticated using (public.is_staff());
drop policy if exists sd_tenant on public.shop_devices;
create policy sd_tenant on public.shop_devices as restrictive for all to authenticated
  using (shop_id = public.current_shop()) with check (shop_id = public.current_shop());
grant select on public.shop_devices to authenticated;          -- writes: RPC-only
grant select, insert, update on public.shop_devices to service_role;

-- Register THIS device (manager/owner, from their own signed-in session on that machine).
-- Returns {id, token} exactly once; the token is never stored in clear.
create or replace function public.device_register(p_name text default 'Shop workstation')
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare v_token text; v_id uuid;
begin
  if not public.is_manager() then raise exception 'only a manager/owner can register a shop workstation'; end if;
  v_token := encode(gen_random_bytes(24), 'hex');
  insert into shop_devices(name, token_hash) values (left(coalesce(nullif(trim(p_name),''),'Shop workstation'), 80), crypt(v_token, gen_salt('bf')))
    returning id into v_id;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (auth.uid(), public.current_staff_role(), 'device_registered', 'shop_devices', v_id::text, jsonb_build_object('name', p_name), public.current_shop());
  return jsonb_build_object('id', v_id, 'token', v_token);
end $function$;
revoke execute on function public.device_register(text) from public, anon;
grant  execute on function public.device_register(text) to authenticated;

create or replace function public.device_revoke(p_id uuid)
returns boolean language plpgsql security definer set search_path to 'public' as $function$
declare v_n int;
begin
  if not public.is_manager() then raise exception 'only a manager/owner can revoke a shop workstation'; end if;
  update shop_devices set revoked_at = now() where id = p_id and shop_id = public.current_shop() and revoked_at is null;
  get diagnostics v_n = row_count;
  if v_n > 0 then
    insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
      values (auth.uid(), public.current_staff_role(), 'device_revoked', 'shop_devices', p_id::text, '{}'::jsonb, public.current_shop());
  end if;
  return v_n > 0;
end $function$;
revoke execute on function public.device_revoke(uuid) from public, anon;
grant  execute on function public.device_revoke(uuid) to authenticated;

-- service_role ONLY (pin-unlock): is this a live registered device of THIS shop?
create or replace function public.device_check(p_id uuid, p_token text, p_shop uuid)
returns boolean language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare v_ok boolean;
begin
  if p_id is null or p_token is null or p_shop is null then return false; end if;
  select (revoked_at is null and token_hash = crypt(p_token, token_hash)) into v_ok
    from shop_devices where id = p_id and shop_id = p_shop;
  if coalesce(v_ok, false) then
    update shop_devices set last_seen_at = now() where id = p_id;
    return true;
  end if;
  return false;
end $function$;
revoke execute on function public.device_check(uuid, text, uuid) from public, anon, authenticated;
grant  execute on function public.device_check(uuid, text, uuid) to service_role;
