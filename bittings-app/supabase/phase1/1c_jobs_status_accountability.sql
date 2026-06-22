-- ============================================================================
-- Phase 1 / Stage 1c — Jobs: status + assignment + accountability gates
-- Promotes booking status to a real column; status/cancel changes go through
-- role-checked RPCs that enforce own-job, front-desk-scheduled-only, and the
-- reconciliation gate. Separation of duties: no one closes a loop alone.
-- ============================================================================

-- 1. bookings: promote status + accountability fields ---------------------------
alter table public.bookings add column if not exists status text not null default 'scheduled';
do $$ begin
  alter table public.bookings add constraint bookings_status_chk
    check (status in ('scheduled','en_route','on_site','in_progress','completed','on_hold','canceled'));
exception when duplicate_object then null; end $$;
alter table public.bookings add column if not exists reconciliation_pending boolean not null default false;
alter table public.bookings add column if not exists responsible_tech uuid;
alter table public.bookings add column if not exists quote_cents integer;
alter table public.bookings add column if not exists cancel_reason text;
alter table public.bookings add column if not exists cancel_detail text;
alter table public.bookings add column if not exists completed_at timestamptz;

-- 2. job_staff (assignment) -----------------------------------------------------
create table if not exists public.job_staff (
  job_id     text not null references public.bookings(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  job_role   text not null default 'lead' check (job_role in ('lead','split_partner','assist')),
  created_at timestamptz not null default now(),
  primary key (job_id, user_id)
);
alter table public.job_staff enable row level security;
grant select, insert, update, delete on public.job_staff to authenticated;
grant select on public.job_staff to service_role;
drop policy if exists jobstaff_select on public.job_staff;
create policy jobstaff_select on public.job_staff for select to authenticated using (public.is_staff());
drop policy if exists jobstaff_insert on public.job_staff;
create policy jobstaff_insert on public.job_staff for insert to authenticated with check (public.is_staff());     -- assign on job creation
drop policy if exists jobstaff_update on public.job_staff;
create policy jobstaff_update on public.job_staff for update to authenticated using (public.is_manager()) with check (public.is_manager());
drop policy if exists jobstaff_delete on public.job_staff;
create policy jobstaff_delete on public.job_staff for delete to authenticated using (public.is_manager());

-- is the caller assigned to this job?  (definer → bypasses RLS, no recursion)
create or replace function public.is_own_job(p_job text)
  returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.job_staff js where js.job_id = p_job and js.user_id = auth.uid())
$$;

-- 3. job_parts (reconciliation: every part used or returned) ---------------------
create table if not exists public.job_parts (
  id            uuid primary key default gen_random_uuid(),
  job_id        text not null references public.bookings(id) on delete cascade,
  item_id       text,
  description   text,
  qty           int not null default 1,
  is_cut_key    boolean not null default false,
  state         text not null default 'pending' check (state in ('pending','used','returned')),
  proof_path    text,                 -- Storage path of the return photo (1d UI uploads it)
  reconciled_at timestamptz, reconciled_by uuid,
  created_at    timestamptz not null default now()
);
alter table public.job_parts enable row level security;
grant select, insert, delete on public.job_parts to authenticated;   -- updates (reconcile) via RPC only
revoke update on public.job_parts from authenticated;
grant select, insert, update, delete on public.job_parts to service_role;
drop policy if exists jobparts_select on public.job_parts;
create policy jobparts_select on public.job_parts for select to authenticated using (public.is_staff());
drop policy if exists jobparts_insert on public.job_parts;
create policy jobparts_insert on public.job_parts for insert to authenticated with check (public.is_staff());
drop policy if exists jobparts_delete on public.job_parts;
create policy jobparts_delete on public.job_parts for delete to authenticated using (public.is_manager());

-- 4. guard: status / reconciliation_pending change ONLY via the RPCs ------------
create or replace function public.fn_guard_booking_status()
  returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.status is distinct from old.status or new.reconciliation_pending is distinct from old.reconciliation_pending)
     and coalesce(current_setting('app.allow_status', true), '') <> '1' then
    raise exception 'status/reconciliation can only change via job_set_status / job_cancel';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_booking_status on public.bookings;
create trigger trg_guard_booking_status before update on public.bookings
  for each row execute function public.fn_guard_booking_status();

-- 5. RPCs ----------------------------------------------------------------------
-- Update job status. Manager/owner: any job. Technician: own jobs only.
-- Front desk: never. Completing requires all parts reconciled (gate).
create or replace function public.job_set_status(p_job text, p_status text)
  returns void language plpgsql security definer set search_path = public as $$
declare v_role text; v_unrec int;
begin
  v_role := public.current_staff_role();
  if v_role is null then raise exception 'not staff'; end if;
  if p_status not in ('scheduled','en_route','on_site','in_progress','completed','on_hold','canceled') then raise exception 'invalid status'; end if;
  if v_role = 'front_desk' then raise exception 'front desk cannot change job status'; end if;
  if v_role = 'technician' and not public.is_own_job(p_job) then raise exception 'technicians can only update their own jobs'; end if;
  if p_status = 'completed' then
    select count(*) into v_unrec from public.job_parts where job_id = p_job and state = 'pending';
    if v_unrec > 0 then raise exception 'cannot complete: % part(s) still need to be reconciled (used or returned)', v_unrec; end if;
  end if;
  perform set_config('app.allow_status', '1', true);
  update public.bookings
     set status = p_status, completed_at = (case when p_status='completed' then now() else completed_at end), updated_at = now()
   where id = p_job;
  perform set_config('app.allow_status', '', true);   -- clear so the flag can't leak to a later direct update
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'job_status', 'bookings', p_job, jsonb_build_object('status', p_status));
end $$;

-- Cancel a job. Reason required. Front desk: only while 'scheduled'. Technician:
-- own jobs only. Unreconciled parts → set reconciliation_pending + responsible tech
-- (Phase-2 hold hook). Phase-2 builds the commission/hold math.
create or replace function public.job_cancel(p_job text, p_reason text, p_detail text)
  returns void language plpgsql security definer set search_path = public as $$
declare v_role text; v_status text; v_unrec int; v_tech uuid;
begin
  v_role := public.current_staff_role();
  if v_role is null then raise exception 'not staff'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'a cancellation reason is required'; end if;
  select status into v_status from public.bookings where id = p_job;
  if v_role = 'front_desk' and coalesce(v_status,'') <> 'scheduled' then raise exception 'front desk can only cancel a job that is still scheduled'; end if;
  if v_role = 'technician' and not public.is_own_job(p_job) then raise exception 'technicians can only cancel their own jobs'; end if;
  select count(*) into v_unrec from public.job_parts where job_id = p_job and state = 'pending';
  select user_id into v_tech from public.job_staff where job_id = p_job and job_role = 'lead' limit 1;
  perform set_config('app.allow_status', '1', true);
  update public.bookings
     set status = 'canceled', cancel_reason = p_reason, cancel_detail = coalesce(p_detail,''),
         reconciliation_pending = (v_unrec > 0),
         responsible_tech = case when v_unrec > 0 then v_tech else responsible_tech end,
         updated_at = now()
   where id = p_job;
  perform set_config('app.allow_status', '', true);   -- clear so the flag can't leak to a later direct update
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'job_cancel', 'bookings', p_job,
            jsonb_build_object('reason', p_reason, 'detail', p_detail, 'unreconciled', v_unrec, 'reconciliation_pending', (v_unrec > 0)));
end $$;

-- Reconcile a part (used or returned). Cut keys require proof (a photo path) —
-- enforced here so the gate can't be tapped past on the honor system.
create or replace function public.job_reconcile_part(p_part uuid, p_state text, p_proof text)
  returns void language plpgsql security definer set search_path = public as $$
declare v_role text; v_job text; v_cut boolean;
begin
  v_role := public.current_staff_role(); if v_role is null then raise exception 'not staff'; end if;
  if p_state not in ('used','returned') then raise exception 'state must be used or returned'; end if;
  select job_id, is_cut_key into v_job, v_cut from public.job_parts where id = p_part;
  if v_job is null then raise exception 'part not found'; end if;
  if v_role = 'technician' and not public.is_own_job(v_job) then raise exception 'technicians can only reconcile their own jobs'; end if;
  if v_cut and p_state = 'returned' and coalesce(trim(p_proof), '') = '' then
    raise exception 'returning a cut key requires proof (a photo)';
  end if;
  update public.job_parts
     set state = p_state, proof_path = coalesce(nullif(p_proof,''), proof_path), reconciled_at = now(), reconciled_by = auth.uid()
   where id = p_part;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'job_part_reconcile', 'job_parts', p_part::text, jsonb_build_object('state', p_state, 'has_proof', (coalesce(trim(p_proof),'') <> '')));
end $$;

revoke execute on function public.is_own_job(text)                       from public;
revoke execute on function public.job_set_status(text,text)              from public;
revoke execute on function public.job_cancel(text,text,text)             from public;
revoke execute on function public.job_reconcile_part(uuid,text,text)     from public;
grant  execute on function public.is_own_job(text)                       to authenticated;
grant  execute on function public.job_set_status(text,text)              to authenticated;
grant  execute on function public.job_cancel(text,text,text)             to authenticated;
grant  execute on function public.job_reconcile_part(uuid,text,text)     to authenticated;

-- 6. private Storage bucket for reconciliation proof photos (1d UI uploads) ------
insert into storage.buckets (id, name, public) values ('job-proof','job-proof',false) on conflict (id) do nothing;
drop policy if exists jobproof_select on storage.objects;
create policy jobproof_select on storage.objects for select to authenticated using (bucket_id = 'job-proof' and public.is_staff());
drop policy if exists jobproof_insert on storage.objects;
create policy jobproof_insert on storage.objects for insert to authenticated with check (bucket_id = 'job-proof' and public.is_staff());
