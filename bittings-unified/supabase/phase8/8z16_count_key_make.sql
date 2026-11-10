-- ============================================================================
-- Phase 8z16 (2026-11-10) — pick a part's MAKE during a stock count
-- ----------------------------------------------------------------------------
-- Owner: "add the option to select the make — we shouldn't have so many that have no makes".
-- cycle_set_key_info gains p_make. The make is written into the part's "Fits" text (inventory.fitment),
-- in front of whatever is there ("Toyota; 13-20 (HYQ14FBA, G BOARD)"), so the vehicle finder on the
-- Stock screen and the Register benefit too. Never added twice; never removes anything.
-- Same rules as 8z12: open count, manager or the assignee, audit_log.
-- Rollback: re-run phase8/8z12_count_key_info.sql after
--   drop function public.cycle_set_key_info(uuid, text, text, text, text);
-- ============================================================================
drop function if exists public.cycle_set_key_info(uuid, text, text, text);
create or replace function public.cycle_set_key_info(p_count uuid, p_item text, p_fcc text default null, p_chip text default null, p_make text default null)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_role text := public.current_staff_role(); v_assigned uuid; v_status text; v_old record;
        v_make text := nullif(left(btrim(coalesce(p_make, '')), 40), '');
begin
  perform public.require_tier('inventory');
  if v_role is null then raise exception 'not staff'; end if;
  select assigned_to, status into v_assigned, v_status from cycle_counts
   where id = p_count and shop_id = public.current_shop();
  if v_status is null then raise exception 'count not found'; end if;
  if v_status <> 'open' then raise exception 'this count is % — cannot edit', v_status; end if;
  if not public.is_manager() and (v_assigned is null or v_assigned <> auth.uid()) then
    raise exception 'you are not assigned to this count'; end if;
  if v_make is not null and v_make !~ '^[A-Za-z][A-Za-z .&/-]*$' then raise exception 'pick a make from the list'; end if;
  select fcc_id, chip, fitment into v_old from inventory where id = p_item and shop_id = public.current_shop() and deleted_at is null;
  if not found then raise exception 'item not found in your shop'; end if;
  update inventory
     set fcc_id = coalesce(nullif(upper(btrim(p_fcc)), ''), fcc_id),
         chip   = coalesce(nullif(btrim(p_chip), ''), chip),
         fitment = case
           when v_make is null then fitment
           when coalesce(btrim(fitment), '') = '' then v_make
           when position(lower(v_make) in lower(fitment)) > 0 then fitment
           else v_make || '; ' || fitment end,
         updated_at = now()
   where id = p_item and shop_id = public.current_shop();
  insert into audit_log(user_id, role, action, entity_type, entity_id, shop_id, detail)
    values (auth.uid(), v_role, 'count_key_info', 'inventory', p_item, public.current_shop(),
            jsonb_build_object('count', p_count, 'fcc_before', v_old.fcc_id, 'fcc_after', nullif(upper(btrim(p_fcc)), ''),
                               'chip_before', v_old.chip, 'chip_after', nullif(btrim(p_chip), ''),
                               'make_added', v_make, 'fits_before', v_old.fitment));
end $function$;
revoke execute on function public.cycle_set_key_info(uuid, text, text, text, text) from public, anon;
grant  execute on function public.cycle_set_key_info(uuid, text, text, text, text) to authenticated;
