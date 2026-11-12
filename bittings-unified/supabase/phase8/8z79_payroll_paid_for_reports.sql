-- 8z79 (owner, 2026-11-12): "In the Reports tab add salaries and commissions paid, including employees and contractors."
--
-- Commission already has a read function (commission_day_rows) and contractor pay lives on the jobs. Hourly wages are
-- frozen in pay_runs when the owner taps "Mark paid" — a table with no direct access — so Reports needs one read-only,
-- owner-only function: the wage payments made between two moments.

create or replace function public.payroll_paid(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare v_shop uuid := public.current_shop();
begin
  if coalesce(public.current_staff_role(), '') <> 'owner' then raise exception 'only the owner can see payroll'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'user_id', pr.user_id, 'name', coalesce(st.name, '(no longer on the team)'),
             'period_start', pr.period_start, 'period_end', pr.period_end,
             'minutes', pr.minutes, 'rate_cents', pr.rate_cents, 'gross_cents', pr.gross_cents, 'paid_at', pr.paid_at)
           order by pr.paid_at)
      from pay_runs pr
      left join staff st on st.user_id = pr.user_id and st.shop_id = pr.shop_id
     where pr.shop_id = v_shop and pr.paid_at >= p_from and pr.paid_at < p_to), '[]'::jsonb);
end $function$;

revoke all on function public.payroll_paid(timestamptz, timestamptz) from public, anon;
grant execute on function public.payroll_paid(timestamptz, timestamptz) to authenticated;

notify pgrst, 'reload schema';
