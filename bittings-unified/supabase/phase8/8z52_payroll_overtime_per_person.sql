-- 8z52 — overtime is chosen PER PERSON (owner, 2026-11-11: "he's 1099, it's different — make it an option").
--   staff.pay_overtime  false (default) = every hour at the normal rate (1099 contractor)
--                       true            = hours over the weekly threshold at payroll_settings.ot_multiplier (40 h / 1.5x)
--   Like hourly_rate_cents, the column is not in the authenticated column grant; it is read/written only by owner-only functions.
-- Rollback: alter table staff drop column pay_overtime; re-run 8z49 for the two functions.
alter table public.staff add column if not exists pay_overtime boolean not null default false;
update public.payroll_settings set ot_multiplier = 1.5 where ot_multiplier < 1.5;   -- the multiplier used WHEN a person has overtime on

create or replace function public.staff_set_overtime(p_user uuid, p_on boolean)
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if public.current_staff_role() <> 'owner' then raise exception 'only the owner can change pay settings'; end if;
  update staff set pay_overtime = coalesce(p_on,false), updated_at = now() where user_id = p_user and shop_id = public.current_shop();
  if not found then raise exception 'not on this team'; end if;
  insert into audit_log(user_id, role, action, entity_type, entity_id, shop_id, detail)
    values (auth.uid(), 'owner', 'pay_overtime', 'staff', p_user::text, public.current_shop(), jsonb_build_object('overtime', coalesce(p_on,false)));
end $function$;
revoke execute on function public.staff_set_overtime(uuid, boolean) from public, anon;
grant  execute on function public.staff_set_overtime(uuid, boolean) to authenticated;

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
  else
    k := floor((p_start - s.period_anchor)::numeric / s.period_days);
  end if;
  v_start := s.period_anchor + k * s.period_days;
  v_end := v_start + (s.period_days - 1);
  v_pay := v_end + s.payday_lag_days;
  select coalesce(jsonb_agg(x order by x->>'name'), '[]'::jsonb) into v_staff from (
    select jsonb_build_object('user_id', st.user_id, 'name', st.name, 'role', st.role, 'pay_plan', st.pay_plan, 'rate_cents', st.hourly_rate_cents, 'overtime', st.pay_overtime)
           || public._payroll_calc(v_shop, st.user_id, v_start, v_end, s.ot_after_minutes, case when st.pay_overtime then s.ot_multiplier else 1 end, st.hourly_rate_cents)
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

create or replace function public.payroll_mark_paid(p_user uuid, p_start date, p_note text default '')
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_shop uuid := public.current_shop(); s payroll_settings%rowtype; v_end date; v_rate int; v_ot boolean; v_mult numeric; c jsonb; k int; v_start date;
begin
  if public.current_staff_role() <> 'owner' then raise exception 'only the owner can record pay'; end if;
  select * into s from payroll_settings where shop_id = v_shop;
  if not found then s.period_anchor := date '2026-10-25'; s.period_days := 14; s.payday_lag_days := 4; s.ot_after_minutes := 2400; s.ot_multiplier := 1.5; end if;
  k := floor((p_start - s.period_anchor)::numeric / s.period_days); v_start := s.period_anchor + k * s.period_days; v_end := v_start + (s.period_days - 1);
  select hourly_rate_cents, pay_overtime into v_rate, v_ot from staff where user_id = p_user and shop_id = v_shop;
  if not found then raise exception 'not on this team'; end if;
  if v_rate is null then raise exception 'set the hourly rate for this person first (Settings, Access and managers, Team logins)'; end if;
  v_mult := case when v_ot then s.ot_multiplier else 1 end;
  c := public._payroll_calc(v_shop, p_user, v_start, v_end, s.ot_after_minutes, v_mult, v_rate);
  insert into pay_runs(shop_id, user_id, period_start, period_end, minutes, regular_minutes, overtime_minutes, rate_cents, ot_multiplier, gross_cents, note, paid_by)
    values (v_shop, p_user, v_start, v_end, (c->>'minutes')::int, (c->>'regular_minutes')::int, (c->>'overtime_minutes')::int, v_rate, v_mult, (c->>'gross_cents')::int, coalesce(p_note,''), auth.uid())
  on conflict (shop_id, user_id, period_start) do update set period_end = excluded.period_end, minutes = excluded.minutes, regular_minutes = excluded.regular_minutes,
    overtime_minutes = excluded.overtime_minutes, rate_cents = excluded.rate_cents, ot_multiplier = excluded.ot_multiplier, gross_cents = excluded.gross_cents,
    note = excluded.note, paid_at = now(), paid_by = auth.uid();
  insert into audit_log(user_id, role, action, entity_type, entity_id, shop_id, detail)
    values (auth.uid(), 'owner', 'payroll_paid', 'staff', p_user::text, v_shop, (c - 'entries' - 'days') || jsonb_build_object('period_start', v_start, 'period_end', v_end, 'rate_cents', v_rate, 'overtime', v_ot));
  return c - 'entries';
end $function$;
notify pgrst, 'reload schema';
