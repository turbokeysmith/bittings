-- 8z76 (owner, 2026-11-12): "For technician clock-in: it has to be done on the shop PC. It cannot be done on mobile.
-- After they've clocked in they can clock out on their phone, but never in."
--
-- How the server knows "the shop PC": a computer a manager / owner has marked in Settings → Time clock & lock
-- ("This device is a shop computer"). That stores an id + secret in that browser and a hash here (shop_devices, 8d);
-- device_check() verifies them. A phone has neither, so it cannot pass.
--
-- The rule:
--   * per shop — shops.tech_clock_in_shop_only (off for a new shop; ON for Turbo Keysmith below);
--   * technicians only — owners, managers and front desk clock in anywhere as before;
--   * clock OUT is not touched (any device);
--   * it only bites once the shop has at least one marked computer. With none, a technician could never clock in at
--     all, so until the first computer is marked phones keep working exactly as before.
-- time_entries has no direct grants to app users (only these functions write it), so the rule cannot be sidestepped.

alter table public.shops add column if not exists tech_clock_in_shop_only boolean not null default false;

-- the old no-argument version must go: two versions that both accept "no arguments" would be ambiguous to the API
drop function if exists public.shift_clock_in();

create or replace function public.shift_clock_in(p_device_id uuid default null, p_device_token text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_role text := public.current_staff_role();
  v_shop uuid := public.current_shop();
  v_row public.time_entries;
  v_on_pc boolean := false;
  v_rule boolean := false;
begin
  if v_role is null then raise exception 'not staff'; end if;
  select * into v_row from time_entries
   where user_id = auth.uid() and shop_id = v_shop and clock_out is null
   limit 1;
  if found then
    return jsonb_build_object('id', v_row.id, 'clock_in', v_row.clock_in, 'already_open', true);
  end if;

  if p_device_id is not null and p_device_token is not null then
    v_on_pc := coalesce(public.device_check(p_device_id, p_device_token, v_shop), false);
  end if;
  if v_role = 'technician' and not v_on_pc then
    select coalesce(s.tech_clock_in_shop_only, false) into v_rule from shops s where s.id = v_shop;
    if coalesce(v_rule, false)
       and exists (select 1 from shop_devices d where d.shop_id = v_shop and d.revoked_at is null) then
      raise exception 'Clock in on the shop computer. From a phone you can only clock out.' using errcode = 'P0001';
    end if;
  end if;

  insert into time_entries(user_id, shop_id) values (auth.uid(), v_shop)
    returning * into v_row;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'clock_in', 'time_entries', v_row.id::text, jsonb_build_object('shop_computer', v_on_pc));
  return jsonb_build_object('id', v_row.id, 'clock_in', v_row.clock_in, 'already_open', false, 'shop_computer', v_on_pc);
end $function$;

revoke all on function public.shift_clock_in(uuid, text) from public, anon;
grant execute on function public.shift_clock_in(uuid, text) to authenticated;

-- what the app needs to draw the button: is the rule on, and how many shop computers are marked
create or replace function public.shift_rules()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case when public.current_staff_role() is null then null else jsonb_build_object(
    'shop_only', coalesce((select s.tech_clock_in_shop_only from shops s where s.id = public.current_shop()), false),
    'shop_computers', (select count(*) from shop_devices d where d.shop_id = public.current_shop() and d.revoked_at is null)) end;
$function$;
revoke all on function public.shift_rules() from public, anon;
grant execute on function public.shift_rules() to authenticated;

-- owner / manager: switch the rule (Settings → Time clock & lock)
create or replace function public.shift_set_shop_only(p_on boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_manager() then raise exception 'only a manager/owner can change where technicians clock in'; end if;
  update shops set tech_clock_in_shop_only = coalesce(p_on, false) where id = public.current_shop();
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (auth.uid(), public.current_staff_role(), 'clock_rule_changed', 'shops', public.current_shop()::text,
            jsonb_build_object('tech_clock_in_shop_only', coalesce(p_on, false)), public.current_shop());
  return public.shift_rules();
end $function$;
revoke all on function public.shift_set_shop_only(boolean) from public, anon;
grant execute on function public.shift_set_shop_only(boolean) to authenticated;

-- Turbo Keysmith: the owner asked for it
update public.shops set tech_clock_in_shop_only = true where id = '7a1754e6-e2f1-40eb-9c03-9d9a1e891bce';

notify pgrst, 'reload schema';
