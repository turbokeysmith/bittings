-- ============================================================================
-- Phase 8c — security hardening found in the 2026-11-07 deep review (C8)
-- ----------------------------------------------------------------------------
-- 1) Plaintext PINs in shop_config.  Setup → "Access & managers" stored each manager's PIN
--    and a shared fallback PIN in shop_config.data (access.employees[].pin / access.quickFormPin).
--    shop_config is readable by EVERY active staff member (shop_config_sel = is_staff()), so a
--    technician could read every manager's PIN. Those PINs only ever gated signed-OUT devices;
--    the real PIN system is staff.pin_hash (bcrypt, 7b set_my_pin / pin_identify). This strips the
--    plaintext keys on every write (trigger) and scrubs what is already stored.
-- 2) shop_members write policy.  5a granted authenticated INSERT/UPDATE/DELETE with a policy that
--    let any OWNER insert arbitrary rows into their own shop — including another user's id with a
--    back-dated created_at, which flips that user's current_shop() (oldest active membership) to the
--    attacker's shop: lock-out + their writes land in the wrong tenant. Membership rows are
--    maintained by the staff→shop_members sync trigger and the definer RPCs (create_shop,
--    staff-invite via service_role); clients never need to write them. Revoke it.
-- Apply: supabase db query --file … --linked --yes
-- ============================================================================

-- 1) strip plaintext PINs -----------------------------------------------------------------
create or replace function public.fn_shop_config_strip_pins()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare v_acc jsonb; v_emps jsonb;
begin
  if new.data is null or not (new.data ? 'access') then return new; end if;
  v_acc := new.data->'access';
  if jsonb_typeof(v_acc) <> 'object' then return new; end if;
  v_acc := v_acc - 'quickFormPin';
  if v_acc ? 'employees' and jsonb_typeof(v_acc->'employees') = 'array' then
    select coalesce(jsonb_agg(case when jsonb_typeof(e) = 'object' then e - 'pin' else e end), '[]'::jsonb)
      into v_emps from jsonb_array_elements(v_acc->'employees') e;
    v_acc := jsonb_set(v_acc, '{employees}', v_emps);
  end if;
  new.data := jsonb_set(new.data, '{access}', v_acc);
  return new;
end $function$;
revoke execute on function public.fn_shop_config_strip_pins() from public, anon, authenticated;

drop trigger if exists trg_shop_config_strip_pins on public.shop_config;
create trigger trg_shop_config_strip_pins
  before insert or update on public.shop_config
  for each row execute function public.fn_shop_config_strip_pins();

-- one-time scrub of what is already stored (the trigger rewrites each row as it passes through)
update public.shop_config set updated_at = now()
 where data ? 'access'
   and ( (data->'access') ? 'quickFormPin'
         or exists (select 1 from jsonb_array_elements(coalesce(data->'access'->'employees','[]'::jsonb)) e
                     where jsonb_typeof(e) = 'object' and e ? 'pin') );

-- 2) shop_members: clients read only ----------------------------------------------------
drop policy if exists sm_write on public.shop_members;
revoke insert, update, delete on public.shop_members from authenticated;
-- (sm_select stays; the sync trigger + definer RPCs + service_role keep working — they bypass RLS.)
