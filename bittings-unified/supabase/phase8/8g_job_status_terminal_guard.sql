-- ============================================================================
-- Phase 8g — job status: terminal states are protected (deep review C8 / scheduler finding)
-- ----------------------------------------------------------------------------
-- job_set_status accepted ANY transition, so a completed or canceled job could be flipped back to
-- 'scheduled' / 'in_progress' by a technician from the status pills (and the client wrote the new
-- label locally before the server answered). Now:
--   • completed / canceled → anything else is a REOPEN: manager/owner only, audited as job_reopen;
--   • everything else is unchanged (incl. the completed-needs-reconciled gate, role rules, fence).
-- Apply: supabase db query --file … --linked --yes
-- ============================================================================
create or replace function public.job_set_status(p_job text, p_status text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_role text; v_unrec int; v_cur text;
begin
  v_role := public.current_staff_role();
  if v_role is null then raise exception 'not staff'; end if;
  select status into v_cur from public.bookings where id = p_job and shop_id = public.current_shop();
  if not found then raise exception 'job not found in your shop'; end if;
  if p_status not in ('scheduled','en_route','on_site','in_progress','completed','on_hold','canceled') then raise exception 'invalid status'; end if;
  if v_role = 'front_desk' then raise exception 'front desk cannot change job status'; end if;
  if v_role = 'technician' and not public.is_own_job(p_job) then raise exception 'technicians can only update their own jobs'; end if;
  if v_cur = p_status then return; end if;                                   -- no-op, no audit noise
  -- 8g: reopening a finished/cancelled job is a manager decision
  if v_cur in ('completed','canceled') and not public.is_manager() then
    raise exception 'this job is already % — only a manager can reopen it', v_cur;
  end if;
  if p_status = 'completed' then
    select count(*) into v_unrec from public.job_parts where job_id = p_job and state = 'pending'
      and shop_id = public.current_shop();
    if v_unrec > 0 then raise exception 'cannot complete: % part(s) still need reconciling', v_unrec; end if;
  end if;
  perform set_config('app.allow_status', '1', true);
  update public.bookings set status = p_status, completed_at = (case when p_status='completed' then now() else completed_at end), updated_at = now()
   where id = p_job and shop_id = public.current_shop();
  perform set_config('app.allow_status', '', true);
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, case when v_cur in ('completed','canceled') then 'job_reopen' else 'job_status' end, 'bookings', p_job,
            jsonb_build_object('status', p_status, 'from', v_cur));
end $function$;
