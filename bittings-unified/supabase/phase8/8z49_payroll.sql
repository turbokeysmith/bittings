-- 8z49 — hourly payroll: rate per person, two-week pay periods, "pay day" reminder, paid log.
--
-- Owner request 2026-11-11: set a technician's hourly pay in Settings ($15/h for Jayden), get paid-every-two-weeks-on-a-
-- Wednesday periods (first one: Sun 25 Oct – Sat 7 Nov 2026, paid Wed 11 Nov), see what is owed, be reminded, mark it paid.
--
--   • staff.hourly_rate_cents — NOT in the column grant for `authenticated` (phase 1a uses column-level SELECT), so no
--     client can read anyone's rate from the table. It only leaves the database through the owner-only functions below.
--   • payroll_settings (one row per shop) — period anchor (a period's first day), length, days from period end to
--     pay day, weekly overtime threshold + multiplier (default: over 40 h in a week at 1.5×; set multiplier to 1 to turn off).
--   • pay_runs — one row per person per period once the owner marks it paid (hours, rate and amount frozen at that moment).
--   • Both tables: RLS on, no grants — reachable only through the SECURITY DEFINER functions (owner only).
--   • Hours come from time_entries (closed entries only), bucketed by the LOCAL date of clock-in (America/Chicago).
--
-- Rollback: drop function payroll_overview(date), payroll_mark_paid(uuid,date,text), payroll_unmark(uuid,date),
--           staff_set_hourly_rate(uuid,int), payroll_set_schedule(date,int,int,int,numeric);
--           drop table pay_runs, payroll_settings; alter table staff drop column hourly_rate_cents;

alter table public.staff add column if not exists hourly_rate_cents int;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'staff_hourly_rate_chk') then
    alter table public.staff add constraint staff_hourly_rate_chk check (hourly_rate_cents is null or (hourly_rate_cents >= 0 and hourly_rate_cents <= 100000));
  end if;
end $$;

create table if not exists public.payroll_settings (
  shop_id          uuid primary key references public.shops(id) on delete cascade,
  period_anchor    date    not null default date '2026-10-25',   -- first day of ANY pay period (a Sunday here)
  period_days      int     not null default 14  check (period_days between 7 and 31),
  payday_lag_days  int     not null default 4   check (payday_lag_days between 0 and 14),   -- period ends Sat → paid Wed
  ot_after_minutes int     not null default 2400 check (ot_after_minutes >= 0),             -- per week
  ot_multiplier    numeric not null default 1.5 check (ot_multiplier >= 1 and ot_multiplier <= 3),
  updated_at       timestamptz not null default now()
);
create table if not exists public.pay_runs (
  id               uuid primary key default gen_random_uuid(),
  shop_id          uuid not null references public.shops(id) on delete cascade,
  user_id          uuid not null,
  period_start     date not null,
  period_end       date not null,
  minutes          int  not null,
  regular_minutes  int  not null,
  overtime_minutes int  not null,
  rate_cents       int  not null,
  ot_multiplier    numeric not null,
  gross_cents      int  not null,
  note             text not null default '',
  paid_at          timestamptz not null default now(),
  paid_by          uuid,
  unique (shop_id, user_id, period_start)
);
alter table public.payroll_settings enable row level security;
alter table public.pay_runs         enable row level security;
revoke all on public.payroll_settings from anon, authenticated;
revoke all on public.pay_runs         from anon, authenticated;

-- Owner sets (or clears with null) one person's hourly rate.
create or replace function public.staff_set_hourly_rate(p_user uuid, p_cents int)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_old int;
begin
  if public.current_staff_role() <> 'owner' then raise exception 'only the owner can change pay rates'; end if;
  if p_cents is not null and (p_cents < 0 or p_cents > 100000) then raise exception 'rate out of range'; end if;
  select hourly_rate_cents into v_old from staff where user_id = p_user and shop_id = public.current_shop();
  if not found then raise exception 'not on this shop''s team'; end if;
  update staff set hourly_rate_cents = p_cents, updated_at = now() where user_id = p_user and shop_id = public.current_shop();
  insert into audit_log(user_id, role, action, entity_type, entity_id, shop_id, detail)
    values (auth.uid(), 'owner', 'hourly_rate', 'staff', p_user::text, public.current_shop(), jsonb_build_object('before', v_old, 'after', p_cents));
end $function$;

-- Owner changes the schedule / overtime rule.
create or replace function public.payroll_set_schedule(p_anchor date, p_days int, p_lag int, p_ot_after_minutes int, p_ot_multiplier numeric)
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if public.current_staff_role() <> 'owner' then raise exception 'only the owner can change the pay schedule'; end if;
  insert into payroll_settings(shop_id, period_anchor, period_days, payday_lag_days, ot_after_minutes, ot_multiplier)
    values (public.current_shop(), coalesce(p_anchor, date '2026-10-25'), coalesce(p_days,14), coalesce(p_lag,4), coalesce(p_ot_after_minutes,2400), coalesce(p_ot_multiplier,1.5))
  on conflict (shop_id) do update set period_anchor = excluded.period_anchor, period_days = excluded.period_days, payday_lag_days = excluded.payday_lag_days,
    ot_after_minutes = excluded.ot_after_minutes, ot_multiplier = excluded.ot_multiplier, updated_at = now();
end $function$;

-- Internal: one person's numbers for one period (weeks are 7-day blocks counted from the period's first day).
create or replace function public._payroll_calc(p_shop uuid, p_user uuid, p_start date, p_end date, p_ot_after int, p_mult numeric, p_rate int)
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  with d as (
    select (t.clock_in at time zone 'America/Chicago')::date as day,
           greatest(0, round(extract(epoch from (t.clock_out - t.clock_in)) / 60.0))::int as mins
      from time_entries t
     where t.shop_id = p_shop and t.user_id = p_user and t.clock_out is not null
       and (t.clock_in at time zone 'America/Chicago')::date between p_start and p_end
  ), w as (
    select ((day - p_start) / 7) as wk, sum(mins)::int as mins from d group by 1
  ), tot as (
    select coalesce(sum(mins),0)::int as minutes,
           coalesce(sum(least(mins, p_ot_after)),0)::int as reg,
           coalesce(sum(greatest(mins - p_ot_after, 0)),0)::int as ot
      from w
  )
  select jsonb_build_object(
    'minutes', tot.minutes, 'regular_minutes', tot.reg, 'overtime_minutes', tot.ot,
    'gross_cents', case when p_rate is null then null else round(tot.reg * p_rate / 60.0 + tot.ot * p_rate * p_mult / 60.0)::int end,
    'weeks', coalesce((select jsonb_agg(jsonb_build_object('start', p_start + (wk * 7), 'minutes', mins) order by wk) from w), '[]'::jsonb),
    'days',  coalesce((select jsonb_agg(jsonb_build_object('day', day, 'minutes', mins) order by day) from (select day, sum(mins)::int as mins from d group by day) x), '[]'::jsonb),
    -- every shift in the period, so the owner can check the total line by line (edited = a manager corrected it / it was entered by hand)
    'entries', coalesce((select jsonb_agg(jsonb_build_object('in', t.clock_in, 'out', t.clock_out,
                            'minutes', case when t.clock_out is null then null else greatest(0, round(extract(epoch from (t.clock_out - t.clock_in)) / 60.0))::int end,
                            'edited', (t.edited_at is not null), 'note', t.note) order by t.clock_in)
                           from time_entries t where t.shop_id = p_shop and t.user_id = p_user
                            and (t.clock_in at time zone 'America/Chicago')::date between p_start and p_end), '[]'::jsonb),
    'open_entries', (select count(*) from time_entries t where t.shop_id = p_shop and t.user_id = p_user and t.clock_out is null
                       and (t.clock_in at time zone 'America/Chicago')::date between p_start and p_end)
  ) from tot
$function$;
revoke execute on function public._payroll_calc(uuid, uuid, date, date, int, numeric, int) from public, anon, authenticated;

-- Owner: everything for one pay period. p_start null = the most recent period whose pay day has arrived.
create or replace function public.payroll_overview(p_start date default null)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v_shop uuid := public.current_shop(); s payroll_settings%rowtype; v_today date := (now() at time zone 'America/Chicago')::date;
        v_start date; v_end date; v_pay date; k int; v_staff jsonb;
begin
  if public.current_staff_role() <> 'owner' then raise exception 'only the owner can see payroll'; end if;
  select * into s from payroll_settings where shop_id = v_shop;
  if not found then
    s.shop_id := v_shop; s.period_anchor := date '2026-10-25'; s.period_days := 14; s.payday_lag_days := 4; s.ot_after_minutes := 2400; s.ot_multiplier := 1.5;
  end if;
  if p_start is null then
    k := floor(((v_today - s.period_anchor) - (s.period_days - 1) - s.payday_lag_days)::numeric / s.period_days);
    v_start := s.period_anchor + k * s.period_days;
  else
    k := floor((p_start - s.period_anchor)::numeric / s.period_days);     -- snap to a real period
    v_start := s.period_anchor + k * s.period_days;
  end if;
  v_end := v_start + (s.period_days - 1);
  v_pay := v_end + s.payday_lag_days;
  select coalesce(jsonb_agg(x order by x->>'name'), '[]'::jsonb) into v_staff from (
    select jsonb_build_object('user_id', st.user_id, 'name', st.name, 'role', st.role, 'pay_plan', st.pay_plan, 'rate_cents', st.hourly_rate_cents)
           || public._payroll_calc(v_shop, st.user_id, v_start, v_end, s.ot_after_minutes, s.ot_multiplier, st.hourly_rate_cents)
           || jsonb_build_object('paid', (select jsonb_build_object('paid_at', pr.paid_at, 'gross_cents', pr.gross_cents, 'minutes', pr.minutes, 'rate_cents', pr.rate_cents, 'note', pr.note)
                                            from pay_runs pr where pr.shop_id = v_shop and pr.user_id = st.user_id and pr.period_start = v_start)) as x
      from staff st
     where st.shop_id = v_shop and st.active and st.role <> 'owner'
  ) q;
  return jsonb_build_object(
    'today', v_today,
    'settings', jsonb_build_object('period_anchor', s.period_anchor, 'period_days', s.period_days, 'payday_lag_days', s.payday_lag_days,
                                   'ot_after_minutes', s.ot_after_minutes, 'ot_multiplier', s.ot_multiplier),
    'period', jsonb_build_object('start', v_start, 'end', v_end, 'payday', v_pay, 'due', v_pay <= v_today,
                                 'prev_start', v_start - s.period_days, 'next_start', v_start + s.period_days),
    'staff', v_staff);
end $function$;

-- Owner: record that a person was paid for a period (numbers are recomputed and frozen here).
create or replace function public.payroll_mark_paid(p_user uuid, p_start date, p_note text default '')
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_shop uuid := public.current_shop(); s payroll_settings%rowtype; v_end date; v_rate int; c jsonb; k int; v_start date;
begin
  if public.current_staff_role() <> 'owner' then raise exception 'only the owner can record pay'; end if;
  select * into s from payroll_settings where shop_id = v_shop;
  if not found then s.period_anchor := date '2026-10-25'; s.period_days := 14; s.payday_lag_days := 4; s.ot_after_minutes := 2400; s.ot_multiplier := 1.5; end if;
  k := floor((p_start - s.period_anchor)::numeric / s.period_days); v_start := s.period_anchor + k * s.period_days; v_end := v_start + (s.period_days - 1);
  select hourly_rate_cents into v_rate from staff where user_id = p_user and shop_id = v_shop;
  if not found then raise exception 'not on this shop''s team'; end if;
  if v_rate is null then raise exception 'set this person''s hourly rate first (Settings → Access & managers → Team logins)'; end if;
  c := public._payroll_calc(v_shop, p_user, v_start, v_end, s.ot_after_minutes, s.ot_multiplier, v_rate);
  insert into pay_runs(shop_id, user_id, period_start, period_end, minutes, regular_minutes, overtime_minutes, rate_cents, ot_multiplier, gross_cents, note, paid_by)
    values (v_shop, p_user, v_start, v_end, (c->>'minutes')::int, (c->>'regular_minutes')::int, (c->>'overtime_minutes')::int, v_rate, s.ot_multiplier, (c->>'gross_cents')::int, coalesce(p_note,''), auth.uid())
  on conflict (shop_id, user_id, period_start) do update set period_end = excluded.period_end, minutes = excluded.minutes, regular_minutes = excluded.regular_minutes,
    overtime_minutes = excluded.overtime_minutes, rate_cents = excluded.rate_cents, ot_multiplier = excluded.ot_multiplier, gross_cents = excluded.gross_cents,
    note = excluded.note, paid_at = now(), paid_by = auth.uid();
  insert into audit_log(user_id, role, action, entity_type, entity_id, shop_id, detail)
    values (auth.uid(), 'owner', 'payroll_paid', 'staff', p_user::text, v_shop, c || jsonb_build_object('period_start', v_start, 'period_end', v_end, 'rate_cents', v_rate));
  return c;
end $function$;

create or replace function public.payroll_unmark(p_user uuid, p_start date)
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if public.current_staff_role() <> 'owner' then raise exception 'only the owner can change pay records'; end if;
  delete from pay_runs where shop_id = public.current_shop() and user_id = p_user and period_start = p_start;
  insert into audit_log(user_id, role, action, entity_type, entity_id, shop_id, detail)
    values (auth.uid(), 'owner', 'payroll_unpaid', 'staff', p_user::text, public.current_shop(), jsonb_build_object('period_start', p_start));
end $function$;

revoke execute on function public.staff_set_hourly_rate(uuid, int) from public, anon;
revoke execute on function public.payroll_set_schedule(date, int, int, int, numeric) from public, anon;
revoke execute on function public.payroll_overview(date) from public, anon;
revoke execute on function public.payroll_mark_paid(uuid, date, text) from public, anon;
revoke execute on function public.payroll_unmark(uuid, date) from public, anon;
grant  execute on function public.staff_set_hourly_rate(uuid, int) to authenticated;
grant  execute on function public.payroll_set_schedule(date, int, int, int, numeric) to authenticated;
grant  execute on function public.payroll_overview(date) to authenticated;
grant  execute on function public.payroll_mark_paid(uuid, date, text) to authenticated;
grant  execute on function public.payroll_unmark(uuid, date) to authenticated;

-- Turbo Keysmith LLC: Jayden Geyer is $15.00 an hour (owner, 2026-11-11); schedule = the defaults above.
update public.staff set hourly_rate_cents = 1500
 where name = 'Jayden Geyer' and shop_id = (select id from public.shops where name = 'Turbo Keysmith LLC');
insert into public.payroll_settings(shop_id) select id from public.shops where name = 'Turbo Keysmith LLC' on conflict do nothing;
-- Owner, 2026-11-11: no overtime for this shop (Jayden is paid as a 1099 contractor) — every hour at the normal rate.
update public.payroll_settings set ot_multiplier = 1 where shop_id = (select id from public.shops where name = 'Turbo Keysmith LLC');

notify pgrst, 'reload schema';
