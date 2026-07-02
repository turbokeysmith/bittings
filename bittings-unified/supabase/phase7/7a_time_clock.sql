-- ============================================================================
-- Phase 7a — TIME CLOCK backbone (shift + timesheet system, owner spec 2026-07-02).
-- ----------------------------------------------------------------------------
-- Model: one time_entries row per work segment (clock_in → clock_out).
--   • Day-start login = clock in (client calls shift_clock_in on sign-in when
--     the shop's time-clock setting is ON — the DB is always ready either way).
--   • Clock out carries a labeled reason: lunch · personal · end_of_day.
--     (Idle-lock/PIN-unlock is NOT a clock event — same open segment.)
--   • At most ONE open segment per user (partial unique index).
-- Reads: staff see their OWN rows; manager/owner see the whole shop.
-- Writes: ONLY through the SECURITY DEFINER RPCs below (no INSERT/UPDATE
-- policies for authenticated) — every manager edit lands in audit_log.
-- Everything is fenced to current_shop() like the rest of phase 5.
-- ============================================================================

create table if not exists public.time_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  shop_id    uuid not null default public.current_shop(),
  clock_in   timestamptz not null default now(),
  clock_out  timestamptz,
  out_reason text check (out_reason in ('lunch','personal','end_of_day')),
  edited_by  uuid,                       -- last manager who corrected the row (null = as recorded)
  edited_at  timestamptz,
  note       text not null default '',
  created_at timestamptz not null default now(),
  constraint time_entries_out_after_in check (clock_out is null or clock_out > clock_in)
);
create index if not exists time_entries_shop_idx on public.time_entries(shop_id);
create index if not exists time_entries_user_idx on public.time_entries(user_id, clock_in desc);
create unique index if not exists time_entries_one_open on public.time_entries(user_id) where clock_out is null;

alter table public.time_entries enable row level security;
drop policy if exists te_sel_own on public.time_entries;
create policy te_sel_own on public.time_entries for select to authenticated using (user_id = auth.uid());
drop policy if exists te_sel_mgr on public.time_entries;
create policy te_sel_mgr on public.time_entries for select to authenticated using (public.is_manager());
drop policy if exists time_entries_tenant on public.time_entries;
create policy time_entries_tenant on public.time_entries as restrictive for all to authenticated
  using (shop_id = public.current_shop()) with check (shop_id = public.current_shop());
grant select on public.time_entries to authenticated;
grant select, insert, update on public.time_entries to service_role;

-- ---------------------------------------------------------------- clock in:
-- Any ACTIVE staff. Idempotent: if a segment is already open, return it
-- (marked already_open) instead of erroring — a re-login never double-clocks.
create or replace function public.shift_clock_in()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_role text := public.current_staff_role(); v_row public.time_entries;
begin
  if v_role is null then raise exception 'not staff'; end if;
  select * into v_row from time_entries
   where user_id = auth.uid() and shop_id = public.current_shop() and clock_out is null
   limit 1;
  if found then
    return jsonb_build_object('id', v_row.id, 'clock_in', v_row.clock_in, 'already_open', true);
  end if;
  insert into time_entries(user_id, shop_id) values (auth.uid(), public.current_shop())
    returning * into v_row;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'clock_in', 'time_entries', v_row.id::text, '{}'::jsonb);
  return jsonb_build_object('id', v_row.id, 'clock_in', v_row.clock_in, 'already_open', false);
end $function$;
revoke execute on function public.shift_clock_in() from public;
grant execute on function public.shift_clock_in() to authenticated;

-- ---------------------------------------------------------------- clock out:
create or replace function public.shift_clock_out(p_reason text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_role text := public.current_staff_role(); v_row public.time_entries;
begin
  if v_role is null then raise exception 'not staff'; end if;
  if p_reason not in ('lunch','personal','end_of_day') then
    raise exception 'reason must be lunch, personal or end_of_day'; end if;
  update time_entries set clock_out = now(), out_reason = p_reason
   where user_id = auth.uid() and shop_id = public.current_shop() and clock_out is null
   returning * into v_row;
  if not found then raise exception 'not clocked in'; end if;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'clock_out', 'time_entries', v_row.id::text, jsonb_build_object('reason', p_reason));
  return jsonb_build_object('id', v_row.id, 'clock_in', v_row.clock_in, 'clock_out', v_row.clock_out, 'reason', p_reason);
end $function$;
revoke execute on function public.shift_clock_out(text) from public;
grant execute on function public.shift_clock_out(text) to authenticated;

-- ------------------------------------------------------------------- status:
create or replace function public.shift_status()
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select coalesce(
    (select jsonb_build_object('id', id, 'clock_in', clock_in)
       from time_entries
      where user_id = auth.uid() and shop_id = public.current_shop() and clock_out is null
      limit 1),
    'null'::jsonb);
$function$;
revoke execute on function public.shift_status() from public;
grant execute on function public.shift_status() to authenticated;

-- --------------------------------------------------------------- timesheets:
-- Staff are HARD-scoped to themselves (p_user is overridden); manager/owner
-- may pass p_user to filter or null for the whole shop.
create or replace function public.timesheet_rows(p_from date, p_to date, p_user uuid default null)
returns table(id uuid, user_id uuid, staff_name text, clock_in timestamptz, clock_out timestamptz,
              out_reason text, minutes integer, edited boolean)
language plpgsql security definer set search_path to 'public' as $function$
declare v_role text := public.current_staff_role();
begin
  if v_role is null then raise exception 'not staff'; end if;
  if not public.is_manager() then p_user := auth.uid(); end if;
  return query
  select te.id, te.user_id,
         coalesce((select s.name from staff s where s.user_id = te.user_id
                     and s.shop_id = public.current_shop()), '—'),
         te.clock_in, te.clock_out, te.out_reason,
         (extract(epoch from (coalesce(te.clock_out, now()) - te.clock_in)) / 60)::int,
         (te.edited_by is not null)
    from time_entries te
   where te.shop_id = public.current_shop()
     and (p_user is null or te.user_id = p_user)
     and (te.clock_in at time zone 'America/Chicago')::date between p_from and p_to
   order by te.clock_in desc;
end $function$;
revoke execute on function public.timesheet_rows(date, date, uuid) from public;
grant execute on function public.timesheet_rows(date, date, uuid) to authenticated;

-- ------------------------------------------------------- manager correction:
-- Fix a missed clock-out / adjust times. Manager/owner only, own shop only,
-- and EVERY edit writes the old→new values to the audit log.
create or replace function public.timesheet_edit(p_entry uuid, p_in timestamptz, p_out timestamptz, p_reason text default null)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_role text := public.current_staff_role(); v_old public.time_entries;
begin
  if not public.is_manager() then raise exception 'timesheet edits are manager/owner only'; end if;
  if p_in is null then raise exception 'clock-in time is required'; end if;
  if p_out is not null and p_out <= p_in then raise exception 'clock-out must be after clock-in'; end if;
  if p_out is not null and coalesce(p_reason,'') not in ('lunch','personal','end_of_day') then
    raise exception 'a closed entry needs a reason (lunch, personal or end_of_day)'; end if;
  select * into v_old from time_entries
   where id = p_entry and shop_id = public.current_shop();
  if not found then raise exception 'entry not found in your shop'; end if;
  update time_entries
     set clock_in = p_in,
         clock_out = p_out,
         out_reason = case when p_out is null then null else p_reason end,
         edited_by = auth.uid(), edited_at = now()
   where id = p_entry and shop_id = public.current_shop();
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'timesheet_edit', 'time_entries', p_entry::text,
            jsonb_build_object(
              'for_user', v_old.user_id,
              'old', jsonb_build_object('in', v_old.clock_in, 'out', v_old.clock_out, 'reason', v_old.out_reason),
              'new', jsonb_build_object('in', p_in, 'out', p_out, 'reason', case when p_out is null then null else p_reason end)));
end $function$;
revoke execute on function public.timesheet_edit(uuid, timestamptz, timestamptz, text) from public;
grant execute on function public.timesheet_edit(uuid, timestamptz, timestamptz, text) to authenticated;
