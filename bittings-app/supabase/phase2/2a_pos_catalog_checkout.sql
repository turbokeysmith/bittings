-- ============================================================================
-- Phase 2 / Stage 2a — POS catalog (sell price + services) + server checkout
-- Additive + idempotent. Applied to the live project via mcp apply_migration
-- (phase2_2a_pos_catalog_and_checkout). Cost stays masked; SELL price is the
-- customer-facing price. The POS "ticket" is a client draft that checks out
-- through pos_checkout(), which RE-PRICES catalog lines server-side (a tech
-- can't tamper), GATES any discount / price-override to manager+, tags each line
-- part/service/programming (commission reads it in 2b), and builds a receipts
-- row so the EXISTING Stripe/cash flow charges it. Verified server-side with the
-- technician + owner test users (catalog-priced PASS; tech discount/override/
-- custom-price BLOCKED; manager discount PASS; per-location decrement + idempotent).
--
-- pos_checkout evolved via two later migrations (live DB is authoritative):
--   • phase2_2a_pos_checkout_setup_services  — a service line can be a SETUP
--       service ({svc,cat}), priced server-side from shop_config.data.services;
--       commission line-type inferred (programming/labor/else service).
--   • phase2_2a_pos_checkout_unpriced_anyone — a SET catalog price can only be
--       changed by a manager; an item with NO catalog price can be priced by ANY
--       staff at the register (setting the missing price, not changing one).
--       Verified: tech prices unpriced PASS · tech changes set price BLOCKED ·
--       manager changes set price PASS.
--   • phase2_2a_pos_checkout_vehicle / _nastf — stores the automotive vehicle +
--       the NASTF tag + D1 deadline on the receipt (see 2e_nastf_d1_tracking.sql).
--   • phase2_pos_checkout_other_lines — the else (custom/"Other", unlisted) branch
--       no longer manager-gates: ANY staff may add a custom-priced line (setting a
--       price for an unlisted item; needs priceCents>0; honors lineType). Discounts
--       + changing a SET catalog price stay manager-only. Verified: tech adds Other
--       service + Other part PASS.
-- ============================================================================

alter table public.inventory add column if not exists sell_price_cents integer;

-- sell price exposed to ALL staff (trailing column); cost still masked.
create or replace view public.inventory_safe with (security_invoker = true) as
  select id, name, sku, category, qty, low_at, unit,
         case when public.is_manager() then cost else null end as cost,
         location, notes, supplier, reorder_qty, fitment, created_at, updated_at, deleted_at, deleted_by,
         sell_price_cents
    from public.inventory
   where public.is_staff() and (deleted_at is null or public.is_manager());

-- services price list (manager-editable; seeded EMPTY — owner fills during testing)
create table if not exists public.services (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null default 'service' check (category in ('service','programming','labor')),
  price_cents integer not null default 0 check (price_cents >= 0),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.services enable row level security;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.services to service_role;
drop policy if exists services_select on public.services;
create policy services_select on public.services for select to authenticated using (public.is_staff());
drop policy if exists services_insert on public.services;
create policy services_insert on public.services for insert to authenticated with check (public.is_manager());
drop policy if exists services_update on public.services;
create policy services_update on public.services for update to authenticated using (public.is_manager()) with check (public.is_manager());
drop policy if exists services_delete on public.services;
create policy services_delete on public.services for delete to authenticated using (public.is_manager());

-- POS checkout — server-prices catalog lines, gates discount/override to manager+,
-- builds a receipts row for the pay flow. See migration body for the payload shape.
create or replace function public.pos_checkout(p_payload jsonb)
  returns text language plpgsql security definer set search_path = public as $$
declare
  v_role text := public.current_staff_role();
  v_disc int := coalesce(nullif(p_payload->>'discountCents','')::int, 0);
  v_taxrate numeric := coalesce(nullif(p_payload->>'taxRate','')::numeric, 0);
  v_id text := 'pos_' || replace(gen_random_uuid()::text,'-','');
  v_items jsonb := '[]'::jsonb;
  v_line jsonb; v_type text; v_qty int; v_price int; v_cost numeric; v_desc text; v_taxable boolean; v_lt text; v_override boolean;
  v_inv record; v_svc record; v_data jsonb;
begin
  if v_role is null then raise exception 'not staff'; end if;
  for v_line in select value from jsonb_array_elements(coalesce(p_payload->'lines','[]'::jsonb)) loop
    v_type := coalesce(v_line->>'type','service');
    v_qty  := greatest(1, coalesce(nullif(v_line->>'qty','')::int, 1));
    v_override := (v_line ? 'priceCents') and nullif(v_line->>'priceCents','') is not null;
    v_cost := null; v_taxable := coalesce((v_line->>'taxable')::boolean, false); v_lt := v_type;
    if v_type = 'part' then
      select * into v_inv from inventory where id = v_line->>'itemId';
      if v_inv.id is null then raise exception 'part not found: %', v_line->>'itemId'; end if;
      v_price := coalesce(v_inv.sell_price_cents, 0); v_cost := v_inv.cost; v_desc := v_inv.name; v_taxable := true; v_lt := 'part';
      if v_override and not public.is_manager() then raise exception 'only a manager can change a price'; end if;
      if v_override then v_price := (v_line->>'priceCents')::int; end if;
    elsif (v_line ? 'serviceId') and nullif(v_line->>'serviceId','') is not null then
      select * into v_svc from services where id = (v_line->>'serviceId')::uuid;
      if v_svc.id is null then raise exception 'service not found'; end if;
      v_price := v_svc.price_cents; v_desc := v_svc.name; v_lt := v_svc.category;
      if v_override and not public.is_manager() then raise exception 'only a manager can change a price'; end if;
      if v_override then v_price := (v_line->>'priceCents')::int; end if;
    else
      if not public.is_manager() then raise exception 'only a manager can set a custom price'; end if;
      v_price := coalesce(nullif(v_line->>'priceCents','')::int, 0);
      v_desc := coalesce(v_line->>'desc','Service'); v_lt := coalesce(v_line->>'type','service');
    end if;
    v_items := v_items || jsonb_build_object(
      'desc', v_desc, 'amount', round((v_price*v_qty)/100.0, 2), 'qty', v_qty, 'taxable', v_taxable, 'lineType', v_lt,
      'partId', case when v_type='part' then v_line->>'itemId' else null end,
      'serviceId', case when v_line ? 'serviceId' then v_line->>'serviceId' else null end,
      'cost', case when v_cost is not null then round(v_cost*v_qty, 2) else null end,
      'unitCost', case when v_cost is not null then v_cost else null end);
  end loop;
  if v_disc <> 0 and not public.is_manager() then raise exception 'only a manager can apply a discount'; end if;
  if v_disc > 0 then
    v_items := v_items || jsonb_build_object('desc', coalesce(nullif(p_payload->>'discountReason',''),'Discount'),
      'isDiscount', true, 'discountMode','amount', 'discountValue', round(v_disc/100.0,2), 'lineType','discount');
  end if;
  v_data := jsonb_build_object(
    'id', v_id, 'number', v_id, 'docType','receipt', 'source','pos',
    'customer', coalesce(p_payload->>'customer',''), 'customerId', p_payload->>'customerId',
    'phone', p_payload->>'phone', 'email', p_payload->>'email', 'bookingId', p_payload->>'bookingId',
    'technician', p_payload->>'technician', 'technicianId', p_payload->>'technicianId',
    'posLocation', coalesce(nullif(p_payload->>'location',''),'shop'),
    'taxRate', v_taxrate, 'status','Unpaid', 'items', v_items);
  insert into public.receipts(id, data) values (v_id, v_data);
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
    values (auth.uid(), v_role, 'pos_checkout', 'receipts', v_id, jsonb_build_object('lines', jsonb_array_length(v_items), 'discount_cents', v_disc));
  return v_id;
end $$;
revoke execute on function public.pos_checkout(jsonb) from public;
grant execute on function public.pos_checkout(jsonb) to authenticated;

-- On completion, decrement sold parts from the ticket's LOCATION (idempotent).
create or replace function public.pos_decrement_stock(p_receipt text)
  returns void language plpgsql security definer set search_path = public as $$
declare v_data jsonb; v_loc text; v_item jsonb; v_id text; v_qty int;
begin
  if public.current_staff_role() is null then raise exception 'not staff'; end if;
  select data into v_data from receipts where id = p_receipt;
  if v_data is null then raise exception 'receipt not found'; end if;
  if coalesce((v_data->>'posStockApplied')::boolean, false) then return; end if;
  v_loc := coalesce(nullif(v_data->>'posLocation',''),'shop');
  for v_item in select value from jsonb_array_elements(coalesce(v_data->'items','[]'::jsonb)) loop
    if nullif(v_item->>'partId','') is null then continue; end if;
    v_id := v_item->>'partId'; v_qty := coalesce((v_item->>'qty')::int, 1);
    insert into inventory_locations(item_id, location, qty) values (v_id, v_loc, 0) on conflict (item_id, location) do nothing;
    update inventory_locations set qty = greatest(0, coalesce(qty,0) - v_qty), updated_at=now() where item_id=v_id and location=v_loc;
    insert into audit_log(user_id, role, action, entity_type, entity_id, detail)
      values (auth.uid(), public.current_staff_role(), 'pos_sold', 'inventory', v_id, jsonb_build_object('location', v_loc, 'qty', v_qty, 'receipt', p_receipt));
  end loop;
  update receipts set data = jsonb_set(data, '{posStockApplied}', 'true'::jsonb), updated_at=now() where id = p_receipt;
end $$;
revoke execute on function public.pos_decrement_stock(text) from public;
grant execute on function public.pos_decrement_stock(text) to authenticated;
