-- ============================================================================
-- Phase 2 tweak / Stage 2e — NASTF tag + D1 filing-deadline tracking
-- Applied live via mcp apply_migration (phase2_nastf_d1_tracking). The live DB
-- is authoritative; this file is the repo record.
--
-- WHAT IT DOES
--  • A NASTF-tagged receipt carries data.nastf =
--      { type, d1Days, d1DueDate:'YYYY-MM-DD', d1Filed,
--        d1FiledAt?, d1FiledBy?, d1FiledByName? }
--    The D1 filing window defaults to 5 days and is manager-set in Setup
--    (shop_config.data.nastf.d1Days). The countdown starts when the job is
--    tagged; the UI shows a color-degrading badge (green→yellow→orange→red→
--    dark-red/overdue) and clears when D1 is filed. The actual D1 is still filed
--    on the NASTF website — Bittings only tracks the deadline + status.
--
--  • pos_checkout(payload) — the desktop register now also stamps the NASTF tag
--    (payload.nastf = the D1 type) + the D1 deadline onto the receipt. (Start-a-Job
--    / the bittings builder stamps the same fields client-side in finish().)
--
--  • can_file_d1(receipt) → boolean — JOB-SCOPED permission (UI mirror): true for
--    a manager/owner, OR the staff who did that job (in job_staff for the receipt's
--    bookingId), OR the seller tagged as technicianId on a walk-up POS sale.
--
--  • set_d1_filed(receipt, filed) — file / un-file the D1. Server-enforced via
--    can_file_d1 (nobody else can flip it). Audit-logged (d1_filed / d1_unfiled).
--
--  • nastf_worklist(include_filed) — the shared outstanding-D1 worklist, sorted by
--    urgency (unfiled first, soonest-due first), each row carrying a can_file flag.
--
-- VERIFIED (server-side, owner + technician test users):
--   stamp {type,d1Days,d1DueDate=today+window,d1Filed:false} · Setup window drives
--   the deadline (window=3 → due today+3) · manager + the seller can file · a
--   non-assigned tech is BLOCKED · worklist sorts unfiled→soonest-due with correct
--   per-row can_file. Test data self-cleaned.
-- ============================================================================

-- (1) pos_checkout — see phase2/2a_pos_catalog_checkout.sql for the full body; this
-- migration added: read d1Days from shop_config.data.nastf (default 5) and, when
-- payload.nastf is set, store data.nastf = {type, d1Days, d1DueDate=current_date+
-- d1Days, d1Filed:false}.

create or replace function public.can_file_d1(p_receipt text)
  returns boolean language plpgsql security definer set search_path = public as $$
declare v_data jsonb;
begin
  if public.current_staff_role() is null then return false; end if;
  select data into v_data from receipts where id = p_receipt and deleted_at is null;
  if v_data is null then return false; end if;
  if public.is_manager() then return true; end if;
  if nullif(v_data->>'technicianId','') is not null and (v_data->>'technicianId')::uuid = auth.uid() then return true; end if;
  if exists (select 1 from job_staff js where js.job_id = v_data->>'bookingId' and js.user_id = auth.uid()) then return true; end if;
  return false;
end $$;
revoke execute on function public.can_file_d1(text) from public;
grant execute on function public.can_file_d1(text) to authenticated;

create or replace function public.set_d1_filed(p_receipt text, p_filed boolean)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_data jsonb; v_role text := public.current_staff_role(); v_name text; v_nastf jsonb;
begin
  if v_role is null then raise exception 'not staff'; end if;
  select data into v_data from receipts where id = p_receipt and deleted_at is null;
  if v_data is null then raise exception 'receipt not found'; end if;
  if (v_data->'nastf'->>'type') is null then raise exception 'not a NASTF job'; end if;
  if not public.can_file_d1(p_receipt) then
    raise exception 'only the staff who did this job or a manager can file D1';
  end if;
  select name into v_name from staff where user_id = auth.uid();
  v_nastf := coalesce(v_data->'nastf','{}'::jsonb)
    || jsonb_build_object('d1Filed', p_filed,
         'd1FiledAt', case when p_filed then now()::text else null end,
         'd1FiledBy', case when p_filed then auth.uid()::text else null end,
         'd1FiledByName', case when p_filed then coalesce(v_name, '') else null end);
  update receipts set data = jsonb_set(data, '{nastf}', v_nastf), updated_at = now() where id = p_receipt;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, case when p_filed then 'd1_filed' else 'd1_unfiled' end, 'receipts', p_receipt,
            jsonb_build_object('type', v_data->'nastf'->>'type'));
  return v_nastf;
end $$;
revoke execute on function public.set_d1_filed(text, boolean) from public;
grant execute on function public.set_d1_filed(text, boolean) to authenticated;

create or replace function public.nastf_worklist(p_include_filed boolean default true)
  returns table(id text, number text, customer text, doc_date text, nastf_type text,
                d1_due date, d1_days int, d1_filed boolean, d1_filed_by_name text, can_file boolean)
  language plpgsql security definer set search_path = public as $$
begin
  if public.current_staff_role() is null then raise exception 'not staff'; end if;
  return query
  select r.id,
         coalesce(nullif(r.data->>'number',''), r.id),
         coalesce(r.data->>'customer',''),
         coalesce(r.data->>'date', to_char(r.created_at at time zone 'America/Chicago','YYYY-MM-DD')),
         r.data->'nastf'->>'type',
         nullif(r.data->'nastf'->>'d1DueDate','')::date,
         coalesce(nullif(r.data->'nastf'->>'d1Days','')::int, 5),
         coalesce((r.data->'nastf'->>'d1Filed')::boolean, false),
         r.data->'nastf'->>'d1FiledByName',
         ( public.is_manager()
           or (nullif(r.data->>'technicianId','') is not null and (r.data->>'technicianId')::uuid = auth.uid())
           or exists (select 1 from job_staff js where js.job_id = r.data->>'bookingId' and js.user_id = auth.uid()) )
    from receipts r
   where r.deleted_at is null and (r.data->'nastf'->>'type') is not null
     and (p_include_filed or not coalesce((r.data->'nastf'->>'d1Filed')::boolean, false))
   order by coalesce((r.data->'nastf'->>'d1Filed')::boolean, false) asc,
            nullif(r.data->'nastf'->>'d1DueDate','')::date asc nulls last,
            r.created_at desc;
end $$;
revoke execute on function public.nastf_worklist(boolean) from public;
grant execute on function public.nastf_worklist(boolean) to authenticated;
