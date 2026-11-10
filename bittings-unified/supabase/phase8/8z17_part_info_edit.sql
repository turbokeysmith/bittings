-- ============================================================================
-- Phase 8z17 (2026-11-10) — technicians can edit a part's info (everything but name, price, cost, qty)
-- ----------------------------------------------------------------------------
-- Owner: "he should just be able to tap it. edit everything but the name and price like make, supplier,
-- count, chip, FCC ID — we are in the process of moving things over. Also … add the link and description".
--   • inventory.link (a product page URL) + the read view exposes it.
--   • inv_update_info(p_item, p_patch jsonb): owner / manager / technician may change ONLY these fields:
--       sku, category, grade, brand, fcc_id, chip, location (bin), supplier, vendor_sku, fitment (Fits / make),
--       notes (description), link, low_at, reorder_qty.
--     Name, sell price, cost and quantity are never touched here (quantity changes go through a stock count,
--     receiving or a sale so they stay logged). Every change → audit_log with before/after.
-- Rollback: drop function public.inv_update_info(text, jsonb); re-create inventory_safe without link;
--           alter table public.inventory drop column link;
-- ============================================================================
alter table public.inventory add column if not exists link text;

create or replace view public.inventory_safe with (security_invoker = true) as
 SELECT id, name, sku, category, qty, low_at, unit,
        CASE WHEN is_manager() THEN cost ELSE NULL::numeric END AS cost,
        location, notes, supplier, reorder_qty,
        CASE WHEN tier_allows('fitment'::text) THEN fitment ELSE ''::text END AS fitment,
        created_at, updated_at, deleted_at, deleted_by, sell_price_cents,
        CASE WHEN tier_allows('fitment'::text) THEN fcc_id ELSE ''::text END AS fcc_id,
        CASE WHEN tier_allows('fitment'::text) THEN chip ELSE ''::text END AS chip,
        serialized, grade, brand, vendor_sku, link
   FROM inventory
  WHERE is_staff() AND (deleted_at IS NULL OR is_manager());

create or replace function public.inv_update_info(p_item text, p_patch jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_role text := public.current_staff_role(); v_old jsonb; v_new jsonb; v_changed jsonb := '{}'::jsonb;
        k text; v text; allowed text[] := array['sku','category','grade','brand','fcc_id','chip','location','supplier',
                                                 'vendor_sku','fitment','notes','link','low_at','reorder_qty'];
begin
  perform public.require_tier('inventory');
  if v_role is null or v_role not in ('owner','manager','technician') then raise exception 'not allowed to edit parts'; end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'nothing to save'; end if;
  select to_jsonb(i) into v_old from inventory i where id = p_item and shop_id = public.current_shop() and deleted_at is null;
  if v_old is null then raise exception 'part not found in your shop'; end if;
  for k in select jsonb_object_keys(p_patch) loop
    if not (k = any(allowed)) then raise exception 'you can''t change % here', k; end if;
  end loop;
  -- on a plan without fitment the app shows these blank — never let a blank overwrite real data
  if not public.tier_allows('fitment') then p_patch := p_patch - 'fitment' - 'fcc_id' - 'chip'; end if;
  if p_patch ? 'link' then
    v := btrim(coalesce(p_patch->>'link', ''));
    if v <> '' and v !~* '^https?://[^\s]+$' then raise exception 'the link must start with http:// or https://'; end if;
  end if;
  update inventory set
    sku         = case when p_patch ? 'sku'         then left(btrim(coalesce(p_patch->>'sku','')), 80)        else sku end,
    category    = case when p_patch ? 'category'    then left(btrim(coalesce(p_patch->>'category','')), 80)   else category end,
    grade       = case when p_patch ? 'grade'       then left(btrim(coalesce(p_patch->>'grade','')), 40)      else grade end,
    brand       = case when p_patch ? 'brand'       then left(btrim(coalesce(p_patch->>'brand','')), 60)      else brand end,
    fcc_id      = case when p_patch ? 'fcc_id'      then upper(left(btrim(coalesce(p_patch->>'fcc_id','')), 60)) else fcc_id end,
    chip        = case when p_patch ? 'chip'        then left(btrim(coalesce(p_patch->>'chip','')), 60)       else chip end,
    location    = case when p_patch ? 'location'    then left(btrim(coalesce(p_patch->>'location','')), 60)   else location end,
    supplier    = case when p_patch ? 'supplier'    then left(btrim(coalesce(p_patch->>'supplier','')), 80)   else supplier end,
    vendor_sku  = case when p_patch ? 'vendor_sku'  then left(btrim(coalesce(p_patch->>'vendor_sku','')), 80) else vendor_sku end,
    fitment     = case when p_patch ? 'fitment'     then left(coalesce(p_patch->>'fitment',''), 4000)         else fitment end,
    notes       = case when p_patch ? 'notes'       then left(coalesce(p_patch->>'notes',''), 4000)           else notes end,
    link        = case when p_patch ? 'link'        then nullif(btrim(coalesce(p_patch->>'link','')), '')     else link end,
    low_at      = case when p_patch ? 'low_at'      then greatest(0, coalesce((p_patch->>'low_at')::int, 0))  else low_at end,
    reorder_qty = case when p_patch ? 'reorder_qty' then greatest(0, coalesce((p_patch->>'reorder_qty')::int, 0)) else reorder_qty end,
    updated_at  = now()
  where id = p_item and shop_id = public.current_shop();
  select to_jsonb(i) into v_new from inventory i where id = p_item and shop_id = public.current_shop();
  for k in select jsonb_object_keys(p_patch) loop
    if (v_old->k) is distinct from (v_new->k) then
      v_changed := v_changed || jsonb_build_object(k, jsonb_build_object('before', v_old->k, 'after', v_new->k)); end if;
  end loop;
  if v_changed <> '{}'::jsonb then
    insert into audit_log(user_id, role, action, entity_type, entity_id, shop_id, detail)
      values (auth.uid(), v_role, 'part_info_edit', 'inventory', p_item, public.current_shop(), v_changed);
  end if;
  return jsonb_build_object('changed', (select coalesce(jsonb_agg(x), '[]'::jsonb) from jsonb_object_keys(v_changed) x));
end $function$;
revoke execute on function public.inv_update_info(text, jsonb) from public, anon;
grant  execute on function public.inv_update_info(text, jsonb) to authenticated;
