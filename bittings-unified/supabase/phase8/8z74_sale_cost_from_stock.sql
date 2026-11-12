-- 8z74 (owner, 2026-11-12): "It says my total profit is $445, which is not correct — we need to remove the cost of the key."
--
-- What was wrong: a key added to a job in the Scheduler arrived on the invoice with no cost on its line, so the payment was
-- recorded with no cost (cost_cents NULL) and Reports showed the whole sale as profit. The payment functions only add up the
-- cost written on the receipt's lines; they never looked at the stock record. A technician's device is never sent costs at all
-- (inventory_safe / receipts_safe hide them), so this cannot be fixed on the device alone.
--
-- What this does: when a payment row is created, any line that is a stock part (has partId) and carries no cost of its own
-- gets its cost from the stock record (inventory.cost x qty). Lines that already carry a cost are used as they are, so the
-- Register (pos_checkout writes the cost on every line) and typed-in costs are unchanged.
--
-- Safety: it only ever sets cost_cents. The whole body sits inside an exception handler — if anything at all goes wrong the
-- payment is recorded exactly as before, without a cost. It never changes an amount and never blocks a payment (card, cash
-- or any other). Fires on INSERT only.

create or replace function public.payment_txn_fill_cost()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_data jsonb; v_shop uuid; it jsonb;
  v_sum numeric := 0; v_any boolean := false;
  v_line numeric; v_qty numeric; v_inv numeric; v_txt text;
begin
  begin
    if new.invoice_id is null then return new; end if;
    select r.data, r.shop_id into v_data, v_shop
      from receipts r
     where r.id = new.invoice_id
     limit 1;
    if v_data is null or jsonb_typeof(v_data->'items') is distinct from 'array' then return new; end if;

    for it in select * from jsonb_array_elements(v_data->'items') loop
      if jsonb_typeof(it) is distinct from 'object' then continue; end if;
      if coalesce(it->>'isDiscount','') = 'true' or coalesce(it->>'declined','') = 'true' then continue; end if;

      v_txt := coalesce(it->>'cost','');
      v_line := case when v_txt ~ '^[0-9]+(\.[0-9]+)?$' then v_txt::numeric else 0 end;
      if v_line > 0 then v_sum := v_sum + v_line; v_any := true; continue; end if;

      if coalesce(it->>'partId','') = '' then continue; end if;
      v_txt := coalesce(it->>'qty','');
      v_qty := case when v_txt ~ '^[0-9]+(\.[0-9]+)?$' then v_txt::numeric else 1 end;
      if v_qty <= 0 then continue; end if;
      select i.cost into v_inv from inventory i where i.id = it->>'partId' and i.shop_id = v_shop limit 1;
      if coalesce(v_inv,0) > 0 then v_sum := v_sum + v_inv * v_qty; v_any := true; end if;
    end loop;

    if v_any then new.cost_cents := greatest(coalesce(new.cost_cents,0), round(v_sum * 100)::int); end if;
  exception when others then
    return new;   -- never let a cost look-up get in the way of recording a payment
  end;
  return new;
end
$function$;

revoke all on function public.payment_txn_fill_cost() from public, anon, authenticated;

drop trigger if exists trg_payment_txn_cost on public.payment_transactions;
create trigger trg_payment_txn_cost
  before insert on public.payment_transactions
  for each row execute function public.payment_txn_fill_cost();

-- The three sales this had already hit (all from Scheduler jobs on 11–12 Nov 2026, the owner's own): give them the cost of
-- the stock part on the receipt. Only rows that still have no cost are touched.
update public.payment_transactions pt
   set cost_cents = x.c
  from (
    select pt2.id,
           (select round(sum(case when coalesce(it->>'qty','') ~ '^[0-9]+$' then (it->>'qty')::numeric else 1 end * i.cost) * 100)::int
              from jsonb_array_elements(r.data->'items') it
              join inventory i on i.id = it->>'partId' and i.shop_id = r.shop_id
             where coalesce(it->>'declined','') <> 'true' and coalesce(i.cost,0) > 0) as c
      from payment_transactions pt2
      join receipts r on r.id = pt2.invoice_id and r.shop_id = pt2.shop_id
     where pt2.id in ('4c018d70-241a-4a1c-9230-22c5ebebf028','1bf26238-ce84-4dee-af81-9f3652c08828','813d4889-923a-4096-afcb-a55274852f27')
       and coalesce(pt2.cost_cents,0) = 0
       and jsonb_typeof(r.data->'items') = 'array'
  ) x
 where pt.id = x.id and coalesce(x.c,0) > 0;
