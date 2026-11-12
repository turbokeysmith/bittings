-- 8z79b (owner, 2026-11-12): "on the Reports tab there are no wages for last month."
--
-- 8z79 counted a wage payment on the day "Mark paid" was tapped. The owner marked eleven past pay periods as paid in one
-- sitting on 11 Nov, so every one of them landed in November and October showed nothing.
-- A pay period now counts on its PAY DAY (the period's last day + the shop's pay-day delay) — when the money is actually
-- due and normally paid — whatever day the button was tapped. Still owner-only, still read-only.

create or replace function public.payroll_paid(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare v_shop uuid := public.current_shop(); v_lag int;
begin
  if coalesce(public.current_staff_role(), '') <> 'owner' then raise exception 'only the owner can see payroll'; end if;
  select payday_lag_days into v_lag from payroll_settings where shop_id = v_shop;
  v_lag := coalesce(v_lag, 4);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'user_id', pr.user_id, 'name', coalesce(st.name, '(no longer on the team)'),
             'period_start', pr.period_start, 'period_end', pr.period_end, 'payday', pr.period_end + v_lag,
             'minutes', pr.minutes, 'rate_cents', pr.rate_cents, 'gross_cents', pr.gross_cents, 'paid_at', pr.paid_at)
           order by pr.period_end, st.name)
      from pay_runs pr
      left join staff st on st.user_id = pr.user_id and st.shop_id = pr.shop_id
     where pr.shop_id = v_shop
       and ((pr.period_end + v_lag)::timestamp at time zone 'America/Chicago') >= p_from
       and ((pr.period_end + v_lag)::timestamp at time zone 'America/Chicago') <  p_to), '[]'::jsonb);
end $function$;

revoke all on function public.payroll_paid(timestamptz, timestamptz) from public, anon;
grant execute on function public.payroll_paid(timestamptz, timestamptz) to authenticated;

notify pgrst, 'reload schema';
