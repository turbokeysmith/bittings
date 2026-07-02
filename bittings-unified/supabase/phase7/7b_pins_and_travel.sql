-- ============================================================================
-- Phase 7b — PIN rules + travel-time derivation (shift system, owner spec).
-- ----------------------------------------------------------------------------
-- PINs (server-side staff.pin_hash, bcrypt):
--   • Everyone ACTIVE can set their OWN PIN (was manager/owner-only).
--   • Length is the role badge: technician/front_desk = exactly 4 digits,
--     manager/owner = exactly 6 digits. A 6-digit PIN at the lock screen is
--     what unlocks into the manager view.
--   • UNIQUE within the shop (bcrypt compare against every other active staff
--     row); different shops may reuse the same digits.
--   • pin_identify() is the lock-screen matcher: service_role ONLY (called by
--     the pin-unlock edge function, never the browser), with a built-in
--     throttle: 5 failed tries per machine per 5 minutes (failures are logged
--     to audit_log as pin_fail, which doubles as the throttle counter).
--
-- Travel time: derived from the scheduler statuses ALREADY being written
-- (job_status audit events) — the gap between en_route and the next on_site
-- for the same job. No new tracking, nothing for techs to do differently.
-- ============================================================================

-- ------------------------------------------------------------- set your PIN:
create or replace function public.set_my_pin(p_pin text)
returns void language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare v_role text := public.current_staff_role(); v_len int;
begin
  if v_role is null then raise exception 'not staff'; end if;
  v_len := case when v_role in ('manager','owner') then 6 else 4 end;
  if p_pin !~ ('^[0-9]{' || v_len || '}$') then
    raise exception 'your PIN must be exactly % digits (%)', v_len,
      case when v_len = 6 then 'manager/owner' else 'staff' end;
  end if;
  -- unique within the shop: no other ACTIVE teammate may already use it
  if exists (select 1 from staff s
              where s.shop_id = public.current_shop() and s.active
                and s.user_id <> auth.uid()
                and s.pin_hash is not null
                and s.pin_hash = crypt(p_pin, s.pin_hash)) then
    raise exception 'that PIN is already taken in this shop — pick another';
  end if;
  update public.staff set pin_hash = crypt(p_pin, gen_salt('bf')), updated_at = now()
   where user_id = auth.uid() and shop_id = public.current_shop();
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'pin_set', 'staff', auth.uid()::text, '{}'::jsonb);
end $function$;
revoke execute on function public.set_my_pin(text) from public;
grant execute on function public.set_my_pin(text) to authenticated;

-- --------------------------------------------- lock-screen matcher (server):
-- service_role ONLY (the pin-unlock edge function). p_caller = the machine's
-- locked session user (throttle key + audit attribution), p_shop = their shop.
create or replace function public.pin_identify(p_pin text, p_caller uuid, p_shop uuid)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare v_fails int; v_hit record;
begin
  select count(*) into v_fails from audit_log
   where action = 'pin_fail' and shop_id = p_shop
     and user_id = p_caller and created_at > now() - interval '5 minutes';
  if v_fails >= 5 then
    raise exception 'too many PIN attempts — wait a few minutes or use full login';
  end if;
  select s.user_id, s.name, s.role into v_hit from staff s
   where s.shop_id = p_shop and s.active
     and s.pin_hash is not null and s.pin_hash = crypt(p_pin, s.pin_hash)
   limit 1;
  if v_hit.user_id is null then
    insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
      values (p_caller, 'unknown', 'pin_fail', 'staff', coalesce(p_caller::text,'-'), '{}'::jsonb, p_shop);
    return null;
  end if;
  return jsonb_build_object('user_id', v_hit.user_id, 'name', v_hit.name, 'role', v_hit.role,
                            'is_self', (v_hit.user_id = p_caller),
                            'is_manager', (v_hit.role in ('manager','owner')));
end $function$;
revoke execute on function public.pin_identify(text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.pin_identify(text, uuid, uuid) to service_role;

-- --------------------------------------------------------------- travel time:
-- en_route → next on_site per job, from the job_status audit events. Staff are
-- HARD-scoped to themselves; manager/owner see the shop (optionally filtered).
create or replace function public.timesheet_travel(p_from date, p_to date, p_user uuid default null)
returns table(job_id text, customer text, tech_id uuid, tech_name text,
              en_route timestamptz, on_site timestamptz, minutes integer)
language plpgsql security definer set search_path to 'public' as $function$
begin
  if public.current_staff_role() is null then raise exception 'not staff'; end if;
  if not public.is_manager() then p_user := auth.uid(); end if;
  return query
  with ev as (
    select al.entity_id, al.user_id, al.detail->>'status' as st, al.created_at
      from audit_log al
     where al.action = 'job_status' and al.shop_id = public.current_shop()
       and al.detail->>'status' in ('en_route','on_site')
       and (al.created_at at time zone 'America/Chicago')::date between p_from and p_to
  ), pairs as (
    select e.entity_id, e.user_id, e.created_at as en_at,
           (select min(o.created_at) from ev o
             where o.entity_id = e.entity_id and o.st = 'on_site' and o.created_at > e.created_at) as on_at
      from ev e where e.st = 'en_route'
  )
  select p.entity_id,
         coalesce((select b.customer_name from bookings b
                    where b.id = p.entity_id and b.shop_id = public.current_shop()), ''),
         p.user_id,
         coalesce((select s.name from staff s
                    where s.user_id = p.user_id and s.shop_id = public.current_shop()), '—'),
         p.en_at, p.on_at,
         (extract(epoch from (p.on_at - p.en_at)) / 60)::int
    from pairs p
   where p.on_at is not null
     and (p_user is null or p.user_id = p_user)
   order by p.en_at desc;
end $function$;
revoke execute on function public.timesheet_travel(date, date, uuid) from public;
grant execute on function public.timesheet_travel(date, date, uuid) to authenticated;
