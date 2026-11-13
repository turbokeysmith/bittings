-- 8z119 (owner, 2026-11-13): "I needed to do the exact serial number that's being scanned … we could have a key in the
-- van and a key in the shop and we need to know which one was where."
--
-- The stock side has honoured scanned keys since 8r: when a receipt line carries `unitIds`, pos_decrement_stock marks
-- THOSE units sold (wherever they are) and only takes "oldest first" for any remainder. The document builder already
-- puts unitIds on its lines. The Register did not: pos_checkout builds each receipt line from a fixed list of fields, so
-- a scanned key's id was dropped and the oldest key of that item was marked sold instead.
--
-- This is the live pos_checkout (read back from the database on 2026-11-13) with ONE added key on a part line:
-- `unitIds`, copied from the Register's line when it is a non-empty array. Prices, tax, totals, discounts, NASTF and
-- everything about payment are untouched.
-- Rollback: re-run the pos_checkout in 8b_receipt_paid_and_tax.sql (or delete the 'unitIds' line below and re-run).

CREATE OR REPLACE FUNCTION public.pos_checkout(p_payload jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role text := public.current_staff_role();
  v_disc int := coalesce(nullif(p_payload->>'discountCents','')::int, 0);
  v_taxrate numeric := coalesce((select sc.tax_rate from shop_config sc where sc.shop_id = public.current_shop()), 0);  -- 8b: the SHOP'S configured rate; the client's taxRate is ignored
  v_id text := 'pos_' || replace(gen_random_uuid()::text,'-','');
  v_items jsonb := '[]'::jsonb;
  v_line jsonb; v_type text; v_qty int; v_price int; v_catalog int; v_cost numeric; v_desc text; v_taxable boolean; v_lt text; v_override boolean;
  v_inv record; v_svc record; v_data jsonb; v_sname text; v_sprice text; v_svcval text; v_veh jsonb := coalesce(p_payload->'vehicle','null'::jsonb);
  v_nastf jsonb := null; v_d1days int;
begin
  perform public.require_tier('pos');  -- 8l: plan check (server-enforced)
  if v_role is null then raise exception 'not staff'; end if;
  for v_line in select value from jsonb_array_elements(coalesce(p_payload->'lines','[]'::jsonb)) loop
    v_type := coalesce(v_line->>'type','service');
    v_qty  := greatest(1, coalesce(nullif(v_line->>'qty','')::int, 1));
    v_override := (v_line ? 'priceCents') and nullif(v_line->>'priceCents','') is not null;
    v_cost := null; v_taxable := coalesce((v_line->>'taxable')::boolean, false); v_lt := v_type; v_catalog := 0;
    if v_type = 'part' then
      select * into v_inv from inventory where id = v_line->>'itemId'
        and shop_id = public.current_shop();
      if v_inv.id is null then raise exception 'part not found: %', v_line->>'itemId'; end if;
      v_catalog := coalesce(v_inv.sell_price_cents, 0); v_price := v_catalog;
      v_cost := v_inv.cost; v_desc := v_inv.name; v_taxable := true; v_lt := 'part';
      if v_override then
        if v_catalog > 0 and not public.is_manager() then raise exception 'only a manager can change a set price'; end if;
        v_price := (v_line->>'priceCents')::int;
      end if;
    elsif (v_line ? 'svc') and nullif(v_line->>'svc','') is not null then
      v_svcval := v_line->>'svc';
      select coalesce(s->>'value', s->>'en'), s->>'price' into v_sname, v_sprice
        from shop_config sc, jsonb_array_elements(coalesce(sc.data->'services','[]'::jsonb)) s
       where sc.shop_id = public.current_shop()
         and s->>'value' = v_svcval and (nullif(v_line->>'cat','') is null or s->>'cat' = v_line->>'cat') limit 1;
      if v_sname is null then raise exception 'service not found in Setup: %', v_svcval; end if;
      v_catalog := round(coalesce(nullif(v_sprice,'')::numeric, 0) * 100); v_price := v_catalog;
      v_desc := v_sname; v_lt := case when v_svcval ilike '%program%' then 'programming' when v_svcval ilike '%labor%' then 'labor' else 'service' end;
      if v_override then
        if v_catalog > 0 and not public.is_manager() then raise exception 'only a manager can change a set price'; end if;
        v_price := (v_line->>'priceCents')::int;
      end if;
    elsif (v_line ? 'serviceId') and nullif(v_line->>'serviceId','') is not null then
      select * into v_svc from services where id = (v_line->>'serviceId')::uuid
        and shop_id = public.current_shop();
      if v_svc.id is null then raise exception 'service not found'; end if;
      v_catalog := coalesce(v_svc.price_cents,0); v_price := v_catalog; v_desc := v_svc.name; v_lt := v_svc.category;
      if v_override then
        if v_catalog > 0 and not public.is_manager() then raise exception 'only a manager can change a set price'; end if;
        v_price := (v_line->>'priceCents')::int;
      end if;
    else
      v_price := coalesce(nullif(v_line->>'priceCents','')::int, 0);
      if v_price <= 0 then raise exception 'an Other/custom line needs a price'; end if;
      v_desc := coalesce(nullif(v_line->>'desc',''),'Service');
      v_lt := coalesce(nullif(v_line->>'lineType',''), nullif(v_line->>'type',''), 'service');
      if v_lt = 'custom' then v_lt := 'service'; end if;
    end if;
    v_items := v_items || jsonb_build_object(
      'desc', v_desc, 'amount', round((v_price*v_qty)/100.0, 2), 'qty', v_qty, 'taxable', v_taxable, 'lineType', v_lt,
      'partId', case when v_type='part' then v_line->>'itemId' else null end,
      'serviceId', case when v_line ? 'serviceId' then v_line->>'serviceId' else null end,
      'svc', case when v_line ? 'svc' then v_line->>'svc' else null end,
      'cost', case when v_cost is not null then round(v_cost*v_qty, 2) else null end,
      'unitCost', case when v_cost is not null then v_cost else null end,
      -- 8z119: the exact keys scanned at the Register ride on the line; pos_decrement_stock (8r) sells THOSE units first
      'unitIds', case when v_type = 'part' and jsonb_typeof(v_line->'unitIds') = 'array' and jsonb_array_length(v_line->'unitIds') > 0 then v_line->'unitIds' else null end);
  end loop;
  if v_disc <> 0 and not public.is_manager() then raise exception 'only a manager can apply a discount'; end if;
  if v_disc > 0 then
    v_items := v_items || jsonb_build_object('desc', coalesce(nullif(p_payload->>'discountReason',''),'Discount'),
      'isDiscount', true, 'discountMode','amount', 'discountValue', round(v_disc/100.0,2), 'lineType','discount');
  end if;
  if nullif(p_payload->>'nastf','') is not null then
    v_d1days := coalesce((select nullif(sc.data->'nastf'->>'d1Days','')::int from shop_config sc
                           where sc.shop_id = public.current_shop()), 5);
    if v_d1days < 1 then v_d1days := 5; end if;
    v_nastf := jsonb_build_object('type', p_payload->>'nastf', 'd1Days', v_d1days,
                 'd1DueDate', (current_date + v_d1days)::text, 'd1Filed', false);
  end if;
  v_data := jsonb_build_object(
    'id', v_id, 'number', v_id, 'docType','receipt', 'source','pos',
    'customer', coalesce(p_payload->>'customer',''), 'customerId', p_payload->>'customerId',
    'phone', p_payload->>'phone', 'email', p_payload->>'email', 'bookingId', p_payload->>'bookingId',
    'technician', p_payload->>'technician', 'technicianId', p_payload->>'technicianId',
    'posLocation', coalesce(nullif(p_payload->>'location',''),'shop'),
    'vehicle', case when v_veh = 'null'::jsonb then null else v_veh end,
    'vehYear', v_veh->>'year', 'vehMake', v_veh->>'make', 'vehModel', v_veh->>'model', 'vin', v_veh->>'vin',
    'nastf', v_nastf,
    'taxRate', v_taxrate, 'status','Unpaid', 'items', v_items);
  insert into public.receipts(id, data) values (v_id, v_data);
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'pos_checkout', 'receipts', v_id, jsonb_build_object('lines', jsonb_array_length(v_items), 'discount_cents', v_disc, 'nastf', (v_nastf is not null)));
  return v_id;
end $function$;
