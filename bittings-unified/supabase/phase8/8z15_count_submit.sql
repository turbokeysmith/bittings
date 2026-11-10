-- ============================================================================
-- Phase 8z15 (2026-11-10) — stock count: the assignee says "done", the count knows its location
-- ----------------------------------------------------------------------------
-- Owner: "he needs a save button or something so he can mark the task as completed".
--   • cycle_counts gains location (picked when the count starts — the tech no longer has to pick it),
--     submitted_at / submitted_by (the assignee tapped "Done — send to manager").
--   • cycle_start takes p_location (old 2-argument calls still work: it defaults to 'shop').
--   • cycle_submit(p_count, p_done): the assignee (or a manager) marks the count done. Every part at the
--     count's location that wasn't touched is recorded as counted = expected (it matched), so the manager
--     sees a complete sheet. p_done=false takes it back ("make more changes"). The manager still applies it
--     with cycle_complete (unchanged).
-- Rollback:
--   drop function public.cycle_submit(uuid, boolean);
--   drop function public.cycle_start(uuid, text, text);
--   (re-create the 8l cycle_start(uuid, text) from git history)
--   alter table public.cycle_counts drop column location, drop column submitted_at, drop column submitted_by;
-- ============================================================================
alter table public.cycle_counts add column if not exists location text;
alter table public.cycle_counts add column if not exists submitted_at timestamptz;
alter table public.cycle_counts add column if not exists submitted_by uuid;

drop function if exists public.cycle_start(uuid, text);
create or replace function public.cycle_start(p_assigned uuid default null, p_note text default '', p_location text default 'shop')
returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare v_id uuid; v_loc text := coalesce(nullif(btrim(p_location), ''), 'shop');
begin
  perform public.require_tier('inventory');
  if not public.is_manager() then raise exception 'only a manager or owner can start a count'; end if;
  if v_loc <> 'shop' and not exists (select 1 from vans where 'van:' || id::text = v_loc and shop_id = public.current_shop()) then
    raise exception 'unknown location'; end if;
  insert into public.cycle_counts(assigned_to, note, shop_id, created_by, location)
    values (p_assigned, coalesce(p_note,''), public.current_shop(), auth.uid(), v_loc) returning id into v_id;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), public.current_staff_role(), 'cycle_start', 'cycle_counts', v_id::text,
            jsonb_build_object('assigned_to', p_assigned, 'location', v_loc));
  return v_id;
end $function$;
revoke execute on function public.cycle_start(uuid, text, text) from public, anon;
grant  execute on function public.cycle_start(uuid, text, text) to authenticated;

create or replace function public.cycle_submit(p_count uuid, p_done boolean default true)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_role text := public.current_staff_role(); v_assigned uuid; v_status text; v_loc text; v_filled int := 0; v_lines int;
begin
  perform public.require_tier('inventory');
  if v_role is null then raise exception 'not staff'; end if;
  select assigned_to, status, coalesce(location, 'shop') into v_assigned, v_status, v_loc
    from cycle_counts where id = p_count and shop_id = public.current_shop() for update;
  if v_status is null then raise exception 'count not found'; end if;
  if v_status <> 'open' then raise exception 'this count is already %', v_status; end if;
  if not public.is_manager() and (v_assigned is null or v_assigned <> auth.uid()) then
    raise exception 'you are not assigned to this count'; end if;
  if p_done then
    -- untouched parts matched: record them as counted = expected (never overwrite a line already saved)
    insert into public.cycle_count_lines(count_id, item_id, location, expected_qty, counted_qty, delta, reason, shop_id)
      select p_count, il.item_id, v_loc, public.inv_on_hand(il.item_id, v_loc), public.inv_on_hand(il.item_id, v_loc), 0, null, public.current_shop()
        from inventory_locations il join inventory i on i.id = il.item_id and i.shop_id = public.current_shop() and i.deleted_at is null
       where il.location = v_loc and il.shop_id = public.current_shop()
      on conflict (count_id, item_id, location) do nothing;
    get diagnostics v_filled = row_count;
    update cycle_counts set submitted_at = now(), submitted_by = auth.uid() where id = p_count;
  else
    update cycle_counts set submitted_at = null, submitted_by = null where id = p_count;
  end if;
  select count(*) into v_lines from cycle_count_lines where count_id = p_count and shop_id = public.current_shop();
  insert into audit_log(user_id, role, action, entity_type, entity_id, shop_id, detail)
    values (auth.uid(), v_role, case when p_done then 'cycle_submit' else 'cycle_reopen' end, 'cycle_counts', p_count::text,
            public.current_shop(), jsonb_build_object('location', v_loc, 'lines', v_lines, 'auto_matched', v_filled));
  return jsonb_build_object('lines', v_lines, 'auto_matched', v_filled, 'submitted', p_done);
end $function$;
revoke execute on function public.cycle_submit(uuid, boolean) from public, anon;
grant  execute on function public.cycle_submit(uuid, boolean) to authenticated;
