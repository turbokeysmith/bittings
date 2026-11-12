-- 8z89 (owner, 2026-11-12): "Give me a button to change all prices with one tap based on the rules."
--
-- The app works out the new price of every key from its cost and the shop's automatic-price rules (8z87), shows the
-- owner what will change, and on his go sends the list here. One call changes every price in one transaction and keeps
-- the old prices, so the whole change can be undone with one more tap.
--   inv_reprice_apply(changes, note)  manager / owner. changes = [{id, cents}]. Only items of this shop; returns how many changed.
--   inv_reprice_undo(batch)           puts back the old price of every item that STILL has the price the batch gave it
--                                     (a price somebody changed by hand afterwards is left alone).
--   inv_reprice_last()                the most recent batch, for the "Undo" button.

create table if not exists public.price_batches (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null default public.current_shop() references public.shops(id) on delete cascade,
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  note        text not null default '',
  changes     jsonb not null,                -- [{id, name, old, new}]
  undone_at   timestamptz,
  undone_by   uuid
);
alter table public.price_batches enable row level security;
drop policy if exists pb_sel on public.price_batches;
create policy pb_sel on public.price_batches for select to authenticated using (public.is_manager());
drop policy if exists pb_tenant on public.price_batches;
create policy pb_tenant on public.price_batches as restrictive for all to authenticated
  using (shop_id = public.current_shop()) with check (shop_id = public.current_shop());
revoke all on public.price_batches from anon, public;
grant select on public.price_batches to authenticated;
grant all on public.price_batches to service_role;

create or replace function public.inv_reprice_apply(p_changes jsonb, p_note text default '')
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_shop uuid := public.current_shop(); c jsonb; v_old int; v_name text; v_new int; v_done jsonb := '[]'::jsonb; v_id uuid; v_n int := 0;
begin
  if not public.is_manager() then raise exception 'only a manager/owner can change prices'; end if;
  if jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) = 0 then raise exception 'nothing to change'; end if;
  if jsonb_array_length(p_changes) > 5000 then raise exception 'too many items in one go'; end if;
  for c in select value from jsonb_array_elements(p_changes) loop
    if coalesce(c->>'cents', '') !~ '^[0-9]{1,9}$' or coalesce(c->>'id', '') = '' then continue; end if;
    v_new := (c->>'cents')::int;
    select sell_price_cents, name into v_old, v_name from inventory where id = c->>'id' and shop_id = v_shop and deleted_at is null for update;
    if not found or v_old is not distinct from v_new then continue; end if;
    update inventory set sell_price_cents = v_new, updated_at = now() where id = c->>'id' and shop_id = v_shop;
    v_done := v_done || jsonb_build_object('id', c->>'id', 'name', v_name, 'old', v_old, 'new', v_new);
    v_n := v_n + 1;
  end loop;
  if v_n = 0 then return jsonb_build_object('changed', 0); end if;
  insert into price_batches(shop_id, created_by, note, changes) values (v_shop, auth.uid(), left(coalesce(p_note, ''), 300), v_done) returning id into v_id;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (auth.uid(), public.current_staff_role(), 'prices_changed_in_bulk', 'price_batches', v_id::text, jsonb_build_object('items', v_n, 'note', coalesce(p_note, '')), v_shop);
  return jsonb_build_object('changed', v_n, 'batch', v_id);
end $function$;

create or replace function public.inv_reprice_undo(p_batch uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_shop uuid := public.current_shop(); b price_batches%rowtype; c jsonb; v_n int := 0; v_skip int := 0; v_r int;
begin
  if not public.is_manager() then raise exception 'only a manager/owner can change prices'; end if;
  select * into b from price_batches where id = p_batch and shop_id = v_shop for update;
  if not found then raise exception 'that price change was not found'; end if;
  if b.undone_at is not null then raise exception 'that price change was already undone'; end if;
  for c in select value from jsonb_array_elements(b.changes) loop
    update inventory set sell_price_cents = case when c->>'old' is null then null else (c->>'old')::int end, updated_at = now()
     where id = c->>'id' and shop_id = v_shop and sell_price_cents is not distinct from (c->>'new')::int;
    get diagnostics v_r = row_count;
    if v_r > 0 then v_n := v_n + 1; else v_skip := v_skip + 1; end if;
  end loop;
  update price_batches set undone_at = now(), undone_by = auth.uid() where id = p_batch;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (auth.uid(), public.current_staff_role(), 'prices_bulk_change_undone', 'price_batches', p_batch::text, jsonb_build_object('restored', v_n, 'left_alone', v_skip), v_shop);
  return jsonb_build_object('restored', v_n, 'left_alone', v_skip);
end $function$;

create or replace function public.inv_reprice_last()
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select case when not public.is_manager() then null else (
    select jsonb_build_object('id', b.id, 'at', b.created_at, 'items', jsonb_array_length(b.changes), 'note', b.note, 'undone_at', b.undone_at,
                              'by', coalesce((select name from staff s where s.user_id = b.created_by and s.shop_id = b.shop_id), ''))
      from price_batches b where b.shop_id = public.current_shop() order by b.created_at desc limit 1) end;
$function$;

revoke all on function public.inv_reprice_apply(jsonb, text) from public, anon;
revoke all on function public.inv_reprice_undo(uuid) from public, anon;
revoke all on function public.inv_reprice_last() from public, anon;
grant execute on function public.inv_reprice_apply(jsonb, text) to authenticated;
grant execute on function public.inv_reprice_undo(uuid) to authenticated;
grant execute on function public.inv_reprice_last() to authenticated;

notify pgrst, 'reload schema';
