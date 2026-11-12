-- 8z77 (owner, 2026-11-12): "He doesn't have a settings to add a PIN."
--
-- 8z76 made technicians clock in on the shop computer, but left them no easy way to do it there:
--   * "My PIN" lived only in Settings → Access & managers, which a technician cannot open;
--   * the lock screen refuses a teammate's PIN unless that teammate is ALREADY clocked in
--     ("start the day with a full login").
-- So the only way in was to sign the shop computer out and sign in again with email + password.
--
-- This adds a time-clock station: on a marked shop computer, whoever is signed in, a person types their own PIN and
-- is clocked in. The computer stays signed in as it was (no session switch). The app also gets a "My PIN" button that
-- every role can reach (it uses the existing set_my_pin).
--
-- Guard rails:
--   * only from a signed-in staff session of this shop, on a registered shop computer (device_check);
--   * the PIN is matched by pin_identify (7b) — bcrypt, 5 wrong tries per 5 minutes per signed-in session, then it
--     refuses; a wrong PIN is RETURNED (not raised) so the failed-try record is kept;
--   * it only ever clocks IN. Clock-out is unchanged (shift_clock_out, own session, any device).

create or replace function public.shift_clock_in_pin(p_pin text, p_device_id uuid, p_device_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_role text := public.current_staff_role();
  v_shop uuid := public.current_shop();
  v_hit jsonb;
  v_uid uuid;
  v_row public.time_entries;
begin
  if v_role is null then raise exception 'not staff'; end if;
  if not coalesce(public.device_check(p_device_id, p_device_token, v_shop), false) then
    raise exception 'Clocking in by PIN only works on a shop computer.' using errcode = 'P0001';
  end if;
  if coalesce(p_pin, '') !~ '^([0-9]{4}|[0-9]{6})$' then
    return jsonb_build_object('ok', false, 'code', 'bad_format', 'error', 'Enter your 4-digit PIN (6 digits for a manager or owner).');
  end if;

  v_hit := public.pin_identify(p_pin, auth.uid(), v_shop);   -- raises "too many PIN attempts" when throttled
  if v_hit is null then
    return jsonb_build_object('ok', false, 'code', 'bad_pin', 'error', 'That PIN is not recognised. Check it, or set one from your own phone: menu → My PIN.');
  end if;
  v_uid := (v_hit->>'user_id')::uuid;

  select * into v_row from time_entries
   where user_id = v_uid and shop_id = v_shop and clock_out is null
   limit 1;
  if found then
    return jsonb_build_object('ok', true, 'already_open', true, 'name', v_hit->>'name', 'clock_in', v_row.clock_in);
  end if;

  insert into time_entries(user_id, shop_id) values (v_uid, v_shop) returning * into v_row;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (v_uid, v_hit->>'role', 'clock_in', 'time_entries', v_row.id::text,
            jsonb_build_object('shop_computer', true, 'by_pin', true, 'signed_in_user', auth.uid()), v_shop);
  return jsonb_build_object('ok', true, 'already_open', false, 'name', v_hit->>'name', 'clock_in', v_row.clock_in);
end $function$;

revoke all on function public.shift_clock_in_pin(text, uuid, text) from public, anon;
grant execute on function public.shift_clock_in_pin(text, uuid, text) to authenticated;

-- the app also needs to know whether the signed-in person has a PIN yet (so it can say "set your PIN first")
create or replace function public.shift_rules()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case when public.current_staff_role() is null then null else jsonb_build_object(
    'shop_only', coalesce((select s.tech_clock_in_shop_only from shops s where s.id = public.current_shop()), false),
    'shop_computers', (select count(*) from shop_devices d where d.shop_id = public.current_shop() and d.revoked_at is null),
    'has_pin', coalesce((select st.pin_hash is not null from staff st
                          where st.user_id = auth.uid() and st.shop_id = public.current_shop() limit 1), false)) end;
$function$;
revoke all on function public.shift_rules() from public, anon;
grant execute on function public.shift_rules() to authenticated;

notify pgrst, 'reload schema';
