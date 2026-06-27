-- =====================================================================
-- Phase 3a — move_requests: technician → manager stock-move approval queue
-- ---------------------------------------------------------------------
-- The actual stock move still happens via the existing inv_move() RPC: a
-- technician RECORDS a request here; a manager approves it, and the app then
-- calls inv_move (managers are permitted). This table is only the synced queue
-- so the request reaches the manager on ANY device (not just the tech's).
-- Approved by owner 2026-06-27. Idempotent — safe to re-run.
-- Depends on phase1 1a (is_staff/is_manager) + 1b (inventory, inv_move).
-- =====================================================================

create table if not exists public.move_requests (
  id                uuid primary key default gen_random_uuid(),
  item_id           text not null references public.inventory(id) on delete cascade,
  item_name         text,                                   -- denormalized for display
  from_loc          text not null,                          -- 'shop' | 'van:<vanId>'
  to_loc            text not null,
  qty               integer not null default 1 check (qty > 0),
  job_id            text,                                   -- optional booking this is for
  note              text,
  status            text not null default 'pending' check (status in ('pending','approved','denied')),
  requested_by      uuid not null default auth.uid(),
  requested_by_name text,
  decided_by        uuid,
  decided_at        timestamptz,
  created_at        timestamptz not null default now()
);

alter table public.move_requests enable row level security;
grant select, insert, update, delete on public.move_requests to authenticated;  -- all gated by the policies below
grant all on public.move_requests to service_role;

-- staff create their OWN request (requested_by must be the caller)
drop policy if exists mr_insert on public.move_requests;
create policy mr_insert on public.move_requests for insert to authenticated
  with check (public.is_staff() and requested_by = auth.uid());

-- managers see ALL pending/decided; a requester sees their own
drop policy if exists mr_select on public.move_requests;
create policy mr_select on public.move_requests for select to authenticated
  using (public.is_manager() or requested_by = auth.uid());

-- only managers decide (approve / deny → status update)
drop policy if exists mr_update on public.move_requests;
create policy mr_update on public.move_requests for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- managers delete any; a requester may withdraw their OWN still-pending request
drop policy if exists mr_delete on public.move_requests;
create policy mr_delete on public.move_requests for delete to authenticated
  using (public.is_manager() or (requested_by = auth.uid() and status = 'pending'));

create index if not exists move_requests_pending_idx on public.move_requests (status, created_at);

-- NOTE: the manager-approve action calls the existing public.inv_move() from the app
-- after flipping status to 'approved'; no new move logic is introduced here.
