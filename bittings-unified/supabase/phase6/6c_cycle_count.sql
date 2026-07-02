-- ============================================================================
-- Phase 6 · 6c — Reconciliation / cycle count
-- A count session (assignable to any staff) with per-item/location lines. Each line
-- snapshots expected on-hand, records counted qty + delta + a PRESET discrepancy
-- reason (required for the assigned staff on any non-zero delta; optional for owner/
-- manager). Completing (manager+) applies deltas via inv_adjust (serialized-aware).
-- Applied live via mcp apply_migration (phase6_6c_cycle_count), 2026-07-01.
-- ============================================================================

create table if not exists public.cycle_counts (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null default public.current_shop(),
  status       text not null default 'open' check (status in ('open','completed','canceled')),
  assigned_to  uuid,
  created_by   uuid default auth.uid(),
  note         text default '',
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);
create table if not exists public.cycle_count_lines (
  id           uuid primary key default gen_random_uuid(),
  count_id     uuid not null references public.cycle_counts(id) on delete cascade,
  shop_id      uuid not null default public.current_shop(),
  item_id      text not null,
  location     text not null default 'shop',
  expected_qty integer not null default 0,
  counted_qty  integer,
  delta        integer,
  reason       text check (reason is null or reason in ('sold_from_van','failed_defective','lost','miscount','other')),
  applied      boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (count_id, item_id, location)
);
alter table public.cycle_counts      enable row level security;
alter table public.cycle_count_lines enable row level security;
grant select on public.cycle_counts, public.cycle_count_lines to authenticated;
revoke insert, update, delete on public.cycle_counts, public.cycle_count_lines from authenticated;
grant select, insert, update, delete on public.cycle_counts, public.cycle_count_lines to service_role;
drop policy if exists cc_select on public.cycle_counts;
create policy cc_select on public.cycle_counts for select to authenticated using (public.is_staff());
drop policy if exists cc_tenant on public.cycle_counts;
create policy cc_tenant on public.cycle_counts as restrictive for all to authenticated
  using (shop_id = public.current_shop()) with check (shop_id = public.current_shop());
drop policy if exists ccl_select on public.cycle_count_lines;
create policy ccl_select on public.cycle_count_lines for select to authenticated using (public.is_staff());
drop policy if exists ccl_tenant on public.cycle_count_lines;
create policy ccl_tenant on public.cycle_count_lines as restrictive for all to authenticated
  using (shop_id = public.current_shop()) with check (shop_id = public.current_shop());

create or replace function public.inv_on_hand(p_item text, p_loc text)
  returns int language sql stable security definer set search_path = public as $$
  select case when (select coalesce(serialized,false) from inventory where id=p_item)
    then (select count(*)::int from inventory_units where item_id=p_item and location=p_loc and status='in_stock')
    else coalesce((select qty from inventory_locations where item_id=p_item and location=p_loc),0) end
$$;
grant execute on function public.inv_on_hand(text,text) to authenticated;

create or replace function public.cycle_start(p_assigned uuid default null, p_note text default '')
  returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_manager() then raise exception 'only a manager or owner can start a count'; end if;
  insert into public.cycle_counts(assigned_to, note, shop_id, created_by)
    values (p_assigned, coalesce(p_note,''), public.current_shop(), auth.uid()) returning id into v_id;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), public.current_staff_role(), 'cycle_start', 'cycle_counts', v_id::text, jsonb_build_object('assigned_to', p_assigned));
  return v_id;
end $$;

create or replace function public.cycle_save_line(p_count uuid, p_item text, p_location text, p_counted int, p_reason text default null)
  returns void language plpgsql security definer set search_path = public as $$
declare v_role text := public.current_staff_role(); v_assigned uuid; v_status text; v_exp int; v_delta int;
begin
  if v_role is null then raise exception 'not staff'; end if;
  select assigned_to, status into v_assigned, v_status from cycle_counts where id = p_count;
  if v_status is null then raise exception 'count not found'; end if;
  if v_status <> 'open' then raise exception 'this count is % — cannot edit', v_status; end if;
  if not public.is_manager() and (v_assigned is null or v_assigned <> auth.uid()) then
    raise exception 'you are not assigned to this count'; end if;
  v_exp := public.inv_on_hand(p_item, p_location);
  v_delta := coalesce(p_counted,0) - v_exp;
  if v_delta <> 0 and not public.is_manager() and coalesce(nullif(p_reason,''),'') = '' then
    raise exception 'a discrepancy reason is required'; end if;
  insert into public.cycle_count_lines(count_id, item_id, location, expected_qty, counted_qty, delta, reason, shop_id)
    values (p_count, p_item, coalesce(nullif(p_location,''),'shop'), v_exp, p_counted, v_delta, nullif(p_reason,''), public.current_shop())
  on conflict (count_id, item_id, location) do update
    set counted_qty = excluded.counted_qty, expected_qty = excluded.expected_qty, delta = excluded.delta,
        reason = excluded.reason, updated_at = now();
end $$;

create or replace function public.cycle_complete(p_count uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_status text; r record; v_lines int := 0; v_adj int := 0; v_net int := 0;
begin
  if not public.is_manager() then raise exception 'only a manager or owner can complete a count'; end if;
  select status into v_status from cycle_counts where id = p_count;
  if v_status is null then raise exception 'count not found'; end if;
  if v_status <> 'open' then raise exception 'count already %', v_status; end if;
  for r in select * from cycle_count_lines where count_id = p_count and counted_qty is not null loop
    v_lines := v_lines + 1;
    if coalesce(r.delta,0) <> 0 then
      perform public.inv_adjust(r.item_id, r.location, r.counted_qty, coalesce(r.reason,'miscount'));
      update cycle_count_lines set applied = true, updated_at = now() where id = r.id;
      v_adj := v_adj + 1; v_net := v_net + r.delta;
    end if;
  end loop;
  update cycle_counts set status='completed', completed_at=now() where id = p_count;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), public.current_staff_role(), 'cycle_complete', 'cycle_counts', p_count::text,
            jsonb_build_object('lines', v_lines, 'adjusted', v_adj, 'net_delta', v_net));
  return jsonb_build_object('lines', v_lines, 'adjusted', v_adj, 'net_delta', v_net);
end $$;

create or replace function public.cycle_cancel(p_count uuid)
  returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_manager() then raise exception 'only a manager or owner can cancel a count'; end if;
  update cycle_counts set status='canceled' where id = p_count and status='open';
end $$;

revoke execute on function public.cycle_start(uuid,text) from public;
revoke execute on function public.cycle_save_line(uuid,text,text,int,text) from public;
revoke execute on function public.cycle_complete(uuid) from public;
revoke execute on function public.cycle_cancel(uuid) from public;
grant execute on function public.cycle_start(uuid,text) to authenticated;
grant execute on function public.cycle_save_line(uuid,text,text,int,text) to authenticated;
grant execute on function public.cycle_complete(uuid) to authenticated;
grant execute on function public.cycle_cancel(uuid) to authenticated;
