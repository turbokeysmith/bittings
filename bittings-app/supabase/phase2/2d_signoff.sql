-- ============================================================================
-- Phase 2 / Stage 2d — manager sign-off / reconciliation approval
-- Applied live via mcp (phase2_2d_signoff_rpcs). Closes the accountability loop:
-- a tech's cancel/reschedule or unreconciled job is flagged (bookings.
-- reconciliation_pending and/or data.needsManagerSignoff). A manager reviews,
-- confirms the equipment is unused / cut key returned (1c photo shown in the UI),
-- and RELEASES the hold — which clears reconciliation_pending, so the commission
-- calc (commission_day_rows reads that flag) releases the commission hold at the
-- same time. Every action is audit-logged. Manager/owner only.
-- Verified: tech can't list/release; owner lists + releases; release clears flag.
-- ============================================================================

create or replace function public.jobs_awaiting_signoff()
  returns table(job_id text, customer text, status text, reconciliation_pending boolean,
                responsible_tech uuid, tech_name text, cancel_reason text, cancel_detail text, updated_at timestamptz, data jsonb)
  language sql security definer set search_path = public as $$
  select b.id, b.customer_name, b.status, b.reconciliation_pending, b.responsible_tech,
         (select s.name from staff s where s.user_id = b.responsible_tech),
         b.cancel_reason, b.cancel_detail, b.updated_at, b.data
  from bookings b
  where public.is_manager()
    and (b.reconciliation_pending = true or coalesce((b.data->>'needsManagerSignoff')::boolean,false) = true)
    and b.deleted_at is null
  order by b.updated_at desc;
$$;
revoke execute on function public.jobs_awaiting_signoff() from public;
grant execute on function public.jobs_awaiting_signoff() to authenticated;

create or replace function public.job_release_hold(p_job text, p_action text, p_note text)
  returns void language plpgsql security definer set search_path = public as $$
declare v_role text := public.current_staff_role();
begin
  if not public.is_manager() then raise exception 'only a manager or owner can sign off a hold'; end if;
  if p_action not in ('release','uphold') then raise exception 'action must be release or uphold'; end if;
  if p_action = 'release' then
    perform set_config('app.allow_status','1',true);
    update bookings
       set reconciliation_pending = false,
           data = jsonb_set(coalesce(data,'{}'::jsonb), '{needsManagerSignoff}', 'false'::jsonb),
           updated_at = now()
     where id = p_job;
    perform set_config('app.allow_status','',true);
  end if;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'job_signoff', 'bookings', p_job, jsonb_build_object('action', p_action, 'note', coalesce(p_note,'')));
end $$;
revoke execute on function public.job_release_hold(text,text,text) from public;
grant execute on function public.job_release_hold(text,text,text) to authenticated;
