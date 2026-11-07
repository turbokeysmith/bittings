-- ============================================================================
-- Phase 8b — receipts get marked PAID server-side; sales tax rate comes from the shop
-- ----------------------------------------------------------------------------
-- (C3) A Register sale never flipped its receipt to Paid: pos_checkout stores status
--      "Unpaid" and neither pay-record nor the Stripe webhook touched receipts.data. Every
--      POS receipt therefore read "Unpaid" in the Receipts view and was excluded from the
--      customer's "paid" history. receipt_mark_paid() is the ONE place the payment functions
--      (service_role) stamp status / payment / paidAt / totals from the authoritative
--      transaction — a jsonb MERGE, so it can never clobber other keys a client wrote.
-- (C2) The same call writes the REAL captured total + surcharge into receipts.data.totals,
--      so a card receipt prints what the card was actually charged.
-- (C4) pos_checkout trusted p_payload->>'taxRate' (any staffer with dev tools could check
--      out at 0%). It now reads shop_config.tax_rate for current_shop(). Everything else in
--      pos_checkout is byte-identical to the live definition captured 2026-11-07.
-- Apply: supabase db query --file … --linked --yes
-- ============================================================================

create or replace function public.receipt_mark_paid(
  p_receipt text, p_shop uuid, p_method text,
  p_captured_cents integer, p_surcharge_cents integer default 0, p_tax_cents integer default null)
returns boolean language plpgsql security definer set search_path to 'public' as $function$
declare v_data jsonb; v_patch jsonb; v_label text; v_totals jsonb; v_sub numeric;
begin
  if p_receipt is null or p_shop is null then return false; end if;
  select data into v_data from receipts where id = p_receipt and shop_id = p_shop;
  if v_data is null then return false; end if;
  v_label := case lower(coalesce(p_method,''))
               when 'cash' then 'Cash' when 'check' then 'Check'
               when 'reader' then 'Card' when 'keyed' then 'Card' when 'card' then 'Card'
               else initcap(coalesce(p_method,'Paid')) end;
  v_totals := coalesce(v_data->'totals', '{}'::jsonb)
           || jsonb_build_object('total', round(p_captured_cents/100.0, 2),
                                 'surcharge', round(coalesce(p_surcharge_cents,0)/100.0, 2));
  if p_tax_cents is not null then
    v_sub := (p_captured_cents - coalesce(p_surcharge_cents,0) - p_tax_cents)/100.0;
    v_totals := v_totals || jsonb_build_object('tax', round(p_tax_cents/100.0, 2), 'subtotal', round(v_sub, 2));
  end if;
  v_patch := jsonb_build_object('status', 'Paid in Full', 'payment', v_label,
                                'paidAt', (extract(epoch from now())*1000)::bigint,
                                'totals', v_totals);
  -- an INVOICE becomes a RECEIPT when paid (mirrors the client: docType + INV→TKS number)
  if coalesce(v_data->>'docType','') in ('invoice','') then
    v_patch := v_patch || jsonb_build_object('docType', 'receipt');
    if v_data ? 'number' and v_data->>'number' is not null then
      v_patch := v_patch || jsonb_build_object('number', regexp_replace(v_data->>'number', '^INV', 'TKS'));
    end if;
  end if;
  update receipts set data = data || v_patch, updated_at = now() where id = p_receipt and shop_id = p_shop;
  return true;
end $function$;

revoke execute on function public.receipt_mark_paid(text, uuid, text, integer, integer, integer) from public, anon, authenticated;
grant  execute on function public.receipt_mark_paid(text, uuid, text, integer, integer, integer) to service_role;
comment on function public.receipt_mark_paid(text, uuid, text, integer, integer, integer) is
  'Payment functions (service_role) stamp a receipt Paid in Full + payment label + real totals (merge). Not callable by clients.';

-- ---------------------------------------------------------------------------
-- (C4) pos_checkout: identical to the live 5j definition except the tax-rate source.
-- ---------------------------------------------------------------------------
create or replace function public.pos_checkout(p_payload jsonb)
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
      'unitCost', case when v_cost is not null then v_cost else null end);
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
