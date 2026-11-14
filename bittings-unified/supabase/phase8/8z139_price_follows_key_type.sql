-- ============================================================================
-- Phase 8 · 8z139 — a key's price follows its TYPE (owner, 2026-11-13: "this was misclassified as a
-- remote key and not a smart key. I wanted when we set smart key it automatically changes the price
-- to match. Or do I have to do that manually because that's going to take so much time")
-- ----------------------------------------------------------------------------
-- The automatic price rules (Settings > Inventory > Automatic key prices) lived only in the app, and
-- only filled the price box while a key was being ADDED. A technician may change a key's type but not
-- its price, so a re-classified key kept the price of its old type.
--
-- 1. key_price_kind(category, name) / auto_price_cents(shop, cost, category, name) — the SAME rule as
--    autoPriceFor() in index.html (8z87 / 8z137 / 8z138), read from the shop's saved settings
--    (shop_config.data->'autoPrice'): smart / remote (remote-head, flip, fob) / transponder / other,
--    each with its own "add %", lowest price and (8z140) highest price, rounded UP to the shop's step.
--    tools/qa/price-rule-sql-check.js compares the two on a grid of costs and types.
-- 2. Trigger inventory_reprice_on_kind (BEFORE UPDATE): when a part's price KIND changes (its category,
--    or a name that makes it a smart key) and the same save did not set a price itself, the price
--    becomes what the rules give for the new kind. Written to audit_log ('part_price_auto').
--    Nothing happens when the rules are switched off, the part has no cost, or it is not a key.
-- 3. inv_update_info also answers with the price, so the screen can show the new one at once.
--
-- Rollback: drop trigger trg_inventory_reprice_on_kind on public.inventory;
--           drop function public.inventory_reprice_on_kind(), public.auto_price_cents(uuid,numeric,text,text), public.auto_price_calc(jsonb,numeric,text,text), public.key_price_kind(text,text);
-- Apply:  npx supabase@3.0.0 db query --remote --yes --file bittings-unified/supabase/phase8/8z139_price_follows_key_type.sql
-- ============================================================================

create or replace function public.key_price_kind(p_category text, p_name text)
returns text language sql immutable set search_path to 'public' as $$
  with s as (select coalesce(p_category, '') as cat, coalesce(p_name, '') as nm),
       t as (select cat, nm, case when position('/' in cat) > 0 then btrim(substr(cat, position('/' in cat) + 1)) else '' end as sub from s)
  select case
           when nm ~* '(peps|prox|proximity|prx)' or sub = 'Smart Key' then 'smart'
           when cat !~* '^keys/' then null                    -- not a key: never priced by the rules
           when sub ~* '^remote' then 'remote'
           when sub ~* '^transponder' then 'transponder'
           else 'other'
         end
    from t;
$$;

-- the rule itself, on a settings object (pure — tools/qa/price-rule-sql-check.js compares it with the app's copy)
create or replace function public.auto_price_calc(a jsonb, p_cost numeric, p_category text, p_name text)
returns integer language plpgsql immutable set search_path to 'public' as $$
declare
  kind text := public.key_price_kind(p_category, p_name);
  pct numeric; mn numeric; mx numeric; step numeric; price numeric; floor_ numeric;
begin
  if kind is null or p_cost is null or p_cost <= 0 then return null; end if;
  -- a shop that never saved its rules uses the app's defaults (app/store.js)
  a := '{"on":true,"stdMarkupPct":150,"smartMarkupPct":200,"roundTo":5,"stdMin":25,"smartMin":75}'::jsonb
       || coalesce(case when jsonb_typeof(a) = 'object' then a end, '{}'::jsonb);
  if (a->'on') is distinct from 'true'::jsonb then return null; end if;

  pct  := public._jnum(a, case kind when 'smart' then 'smartMarkupPct' when 'remote' then 'remoteMarkupPct' when 'transponder' then 'transponderMarkupPct' else 'stdMarkupPct' end);
  mn   := public._jnum(a, case kind when 'smart' then 'smartMin'       when 'remote' then 'remoteMin'       when 'transponder' then 'transponderMin'       else 'stdMin' end);
  mx   := public._jnum(a, case kind when 'smart' then 'smartMax'       when 'remote' then 'remoteMax'       when 'transponder' then 'transponderMax'       else 'stdMax' end);
  if kind <> 'smart' then                                -- blank = the "other keys" numbers (the highest price has no fall-back: blank = none)
    pct := coalesce(pct, public._jnum(a, 'stdMarkupPct'));
    mn  := coalesce(mn,  public._jnum(a, 'stdMin'));
  end if;
  pct  := greatest(0, coalesce(pct, 0));
  mn   := greatest(0, coalesce(mn, 0));
  step := greatest(0, coalesce(public._jnum(a, 'roundTo'), 0));

  price := p_cost * (1 + pct / 100);
  if step > 0 then price := ceil((price - 0.000000001) / step) * step; end if;
  if price < mn then price := mn; end if;
  -- 8z140: a highest price (expensive keys cannot carry the same percentage) — but never under what the key cost
  if mx is not null and mx > 0 and price > mx then
    floor_ := p_cost; if step > 0 then floor_ := ceil((p_cost - 0.000000001) / step) * step; end if;
    price := greatest(mx, floor_);
  end if;
  return round(price * 100)::integer;
end;
$$;

create or replace function public.auto_price_cents(p_shop uuid, p_cost numeric, p_category text, p_name text)
returns integer language sql stable security definer set search_path to 'public' as $$
  select public.auto_price_calc((select data->'autoPrice' from public.shop_config where shop_id = p_shop limit 1), p_cost, p_category, p_name);
$$;

-- a number out of a settings object: a JSON number, or text that is a number; anything else = not set
create or replace function public._jnum(a jsonb, k text)
returns numeric language sql immutable set search_path to 'public' as $$
  select case
           when jsonb_typeof(a->k) = 'number' then (a->>k)::numeric
           when jsonb_typeof(a->k) = 'string' and (a->>k) ~ '^\s*[0-9]+(\.[0-9]+)?\s*$' then btrim(a->>k)::numeric
           else null
         end;
$$;

create or replace function public.inventory_reprice_on_kind()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare k_old text; k_new text; v_new integer;
begin
  if new.category is not distinct from old.category and new.name is not distinct from old.name then return new; end if;
  if new.sell_price_cents is distinct from old.sell_price_cents then return new; end if;   -- this save set a price itself
  if new.deleted_at is not null then return new; end if;
  k_old := public.key_price_kind(old.category, old.name);
  k_new := public.key_price_kind(new.category, new.name);
  if k_new is null or k_new is not distinct from k_old then return new; end if;
  v_new := public.auto_price_cents(new.shop_id, new.cost, new.category, new.name);
  if v_new is null or v_new is not distinct from old.sell_price_cents then return new; end if;
  new.sell_price_cents := v_new;
  begin
    insert into public.audit_log(user_id, role, action, entity_type, entity_id, shop_id, detail)
      values (auth.uid(), public.current_staff_role(), 'part_price_auto', 'inventory', new.id, new.shop_id,
              jsonb_build_object('reason', 'key type changed', 'from_kind', k_old, 'to_kind', k_new,
                                 'before', old.sell_price_cents, 'after', v_new, 'cost', new.cost));
  exception when others then null;   -- a logging problem must not block the save
  end;
  return new;
end;
$$;

revoke all on function public.inventory_reprice_on_kind() from public;
revoke all on function public.auto_price_cents(uuid, numeric, text, text) from public;
grant execute on function public.auto_price_cents(uuid, numeric, text, text) to service_role;
grant execute on function public.key_price_kind(text, text), public._jnum(jsonb, text), public.auto_price_calc(jsonb, numeric, text, text) to public;

drop trigger if exists trg_inventory_reprice_on_kind on public.inventory;
create trigger trg_inventory_reprice_on_kind
  before update on public.inventory
  for each row execute function public.inventory_reprice_on_kind();

-- inv_update_info: unchanged except that it now answers with the price (see the header, 3.)
CREATE OR REPLACE FUNCTION public.inv_update_info(p_item text, p_patch jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_role text := public.current_staff_role(); v_old jsonb; v_new jsonb; v_changed jsonb := '{}'::jsonb;
        k text; v text; allowed text[] := array['sku','category','grade','brand','fcc_id','chip','location','supplier',
                                                 'vendor_sku','fitment','notes','link','low_at','reorder_qty','image'];
begin
  perform public.require_tier('inventory');
  if v_role is null or v_role not in ('owner','manager','technician') then raise exception 'not allowed to edit parts'; end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'nothing to save'; end if;
  select to_jsonb(i) into v_old from inventory i where id = p_item and shop_id = public.current_shop() and deleted_at is null;
  if v_old is null then raise exception 'part not found in your shop'; end if;
  for k in select jsonb_object_keys(p_patch) loop
    if not (k = any(allowed)) then raise exception 'you can''t change % here', k; end if;
  end loop;
  if not public.tier_allows('fitment') then p_patch := p_patch - 'fitment' - 'fcc_id' - 'chip'; end if;
  if p_patch ? 'link' then
    v := btrim(coalesce(p_patch->>'link', ''));
    if v <> '' and v !~* '^https?://[^\s]+$' then raise exception 'the link must start with http:// or https://'; end if;
  end if;
  if p_patch ? 'image' then   -- 8z18: a path in THIS shop's folder of the part-images bucket
    v := btrim(coalesce(p_patch->>'image', ''));
    if v <> '' and v !~ ('^' || public.current_shop()::text || '/[A-Za-z0-9._-]+\.(webp|jpg|jpeg|png)$') then raise exception 'bad photo path'; end if;
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
    image       = case when p_patch ? 'image'       then nullif(btrim(coalesce(p_patch->>'image','')), '')    else image end,
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
  -- 8z139: the price may have followed a change of key type (trigger inventory_reprice_on_kind) — tell the app
  return jsonb_build_object('changed', (select coalesce(jsonb_agg(x), '[]'::jsonb) from jsonb_object_keys(v_changed) x),
    'sell_price_cents', v_new->'sell_price_cents',
    'price_changed', (v_old->'sell_price_cents') is distinct from (v_new->'sell_price_cents'),
    'price_before', v_old->'sell_price_cents');
end $function$;
