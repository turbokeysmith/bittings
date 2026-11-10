-- ============================================================================
-- Phase 8z12 (2026-11-09) — fill in missing FCC ID / chip during a stock count
-- ----------------------------------------------------------------------------
-- Owner: technicians can't edit parts, but Jayden (technician) should fill in chips / FCC IDs —
-- "part of the stock count". Whoever may save lines on an OPEN count (a manager/owner, or the
-- person the count is assigned to) may also set the FCC ID and chip of parts in that shop. Only
-- those two fields; blank input never erases an existing value. Every change → audit_log.
-- Rollback: drop function public.cycle_set_key_info(uuid, text, text, text);
-- ============================================================================
create or replace function public.cycle_set_key_info(p_count uuid, p_item text, p_fcc text default null, p_chip text default null)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_role text := public.current_staff_role(); v_assigned uuid; v_status text; v_old record;
begin
  perform public.require_tier('inventory');
  if v_role is null then raise exception 'not staff'; end if;
  select assigned_to, status into v_assigned, v_status from cycle_counts
   where id = p_count and shop_id = public.current_shop();
  if v_status is null then raise exception 'count not found'; end if;
  if v_status <> 'open' then raise exception 'this count is % — cannot edit', v_status; end if;
  if not public.is_manager() and (v_assigned is null or v_assigned <> auth.uid()) then
    raise exception 'you are not assigned to this count'; end if;
  select fcc_id, chip into v_old from inventory where id = p_item and shop_id = public.current_shop() and deleted_at is null;
  if not found then raise exception 'item not found in your shop'; end if;
  update inventory
     set fcc_id = coalesce(nullif(upper(btrim(p_fcc)), ''), fcc_id),
         chip   = coalesce(nullif(btrim(p_chip), ''), chip),
         updated_at = now()
   where id = p_item and shop_id = public.current_shop();
  insert into audit_log(user_id, role, action, entity_type, entity_id, shop_id, detail)
    values (auth.uid(), v_role, 'count_key_info', 'inventory', p_item, public.current_shop(),
            jsonb_build_object('count', p_count, 'fcc_before', v_old.fcc_id, 'fcc_after', nullif(upper(btrim(p_fcc)), ''),
                               'chip_before', v_old.chip, 'chip_after', nullif(btrim(p_chip), '')));
end $function$;
revoke execute on function public.cycle_set_key_info(uuid, text, text, text) from public, anon;
grant  execute on function public.cycle_set_key_info(uuid, text, text, text) to authenticated;
