-- 8z86 (owner, 2026-11-12): "it gave him the option without me telling him he can. I need to assign the receivables
-- to him."
--
-- Booking in a delivery (the Receive tab, 8z83b) was open to every staff member. It is now a task the owner or a
-- manager ASSIGNS — like a stock count: pick the person, optionally say what the delivery is, and the Receive tab and
-- "add a new item" open for that person until the task is finished. Owners and managers can always receive.
--
--   receive_tasks            one row per assignment; nothing is deleted (closed_at + what was booked in)
--   receive_task_assign      manager / owner → open a task for a staff member (one open task per person)
--   receive_task_close       the assignee ("finished") or a manager → close it, keeping the list of what was booked in
--   receive_tasks_list       what the screen shows: my open task; for a manager every open task + the recent finished ones
--   inv_add_new              now refuses a technician / front desk with no open task
-- Not changed: receiving more of ONE existing item from its stock panel (📍 → Receive, inv_receive) — open to
-- technicians since 8z9 at the owner's request.

create table if not exists public.receive_tasks (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null default public.current_shop() references public.shops(id) on delete cascade,
  assigned_to  uuid not null,
  assigned_by  uuid default auth.uid(),
  note         text not null default '',
  created_at   timestamptz not null default now(),
  closed_at    timestamptz,
  closed_by    uuid,
  summary      jsonb not null default '[]'::jsonb
);
create index if not exists receive_tasks_open_idx on public.receive_tasks (shop_id, assigned_to) where closed_at is null;
alter table public.receive_tasks enable row level security;
drop policy if exists rt_sel on public.receive_tasks;
create policy rt_sel on public.receive_tasks for select to authenticated
  using (public.is_staff() and (public.current_staff_role() in ('owner', 'manager') or assigned_to = auth.uid()));
drop policy if exists rt_tenant on public.receive_tasks;
create policy rt_tenant on public.receive_tasks as restrictive for all to authenticated
  using (shop_id = public.current_shop()) with check (shop_id = public.current_shop());
revoke all on public.receive_tasks from anon, public;
grant select on public.receive_tasks to authenticated;   -- every change goes through the functions below
grant all on public.receive_tasks to service_role;

create or replace function public.can_receive_stock()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce(public.current_staff_role() in ('owner', 'manager'), false)
      or exists (select 1 from receive_tasks t where t.shop_id = public.current_shop() and t.assigned_to = auth.uid() and t.closed_at is null);
$function$;

create or replace function public.receive_task_assign(p_user uuid, p_note text default '')
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_shop uuid := public.current_shop(); v_id uuid; v_name text;
begin
  if not public.is_manager() then raise exception 'only a manager/owner can assign a delivery'; end if;
  select name into v_name from staff where user_id = p_user and shop_id = v_shop and active;
  if not found then raise exception 'that person is not on your team'; end if;
  select id into v_id from receive_tasks where shop_id = v_shop and assigned_to = p_user and closed_at is null limit 1;
  if found then
    update receive_tasks set note = left(coalesce(p_note, ''), 300) where id = v_id and coalesce(p_note, '') <> '';
    return jsonb_build_object('id', v_id, 'already_open', true, 'name', v_name);
  end if;
  insert into receive_tasks(shop_id, assigned_to, assigned_by, note) values (v_shop, p_user, auth.uid(), left(coalesce(p_note, ''), 300)) returning id into v_id;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (auth.uid(), public.current_staff_role(), 'receive_task_assigned', 'receive_tasks', v_id::text, jsonb_build_object('to', p_user, 'name', v_name, 'note', coalesce(p_note, '')), v_shop);
  return jsonb_build_object('id', v_id, 'already_open', false, 'name', v_name);
end $function$;

create or replace function public.receive_task_close(p_id uuid, p_summary jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_shop uuid := public.current_shop(); v_to uuid; v_sum jsonb := coalesce(p_summary, '[]'::jsonb);
begin
  if public.current_staff_role() is null then raise exception 'not staff'; end if;
  select assigned_to into v_to from receive_tasks where id = p_id and shop_id = v_shop and closed_at is null;
  if not found then raise exception 'that delivery task is not open'; end if;
  if v_to <> auth.uid() and not public.is_manager() then raise exception 'that delivery is assigned to someone else'; end if;
  if jsonb_typeof(v_sum) <> 'array' or length(v_sum::text) > 60000 then v_sum := '[]'::jsonb; end if;
  update receive_tasks set closed_at = now(), closed_by = auth.uid(), summary = v_sum where id = p_id;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (auth.uid(), public.current_staff_role(), 'receive_task_closed', 'receive_tasks', p_id::text, jsonb_build_object('lines', jsonb_array_length(v_sum)), v_shop);
  return jsonb_build_object('ok', true);
end $function$;

create or replace function public.receive_tasks_list()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v_shop uuid := public.current_shop(); v_mgr boolean := coalesce(public.current_staff_role() in ('owner', 'manager'), false);
begin
  if public.current_staff_role() is null then return null; end if;
  return jsonb_build_object(
    'manager', v_mgr,
    'can', public.can_receive_stock(),
    'mine', (select jsonb_build_object('id', t.id, 'note', t.note, 'created_at', t.created_at, 'by', coalesce((select name from staff s where s.user_id = t.assigned_by and s.shop_id = v_shop), ''))
               from receive_tasks t where t.shop_id = v_shop and t.assigned_to = auth.uid() and t.closed_at is null order by t.created_at limit 1),
    'open', case when v_mgr then coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'assigned_to', t.assigned_to, 'name', coalesce(s.name, '(removed)'), 'note', t.note, 'created_at', t.created_at) order by t.created_at)
               from receive_tasks t left join staff s on s.user_id = t.assigned_to and s.shop_id = t.shop_id where t.shop_id = v_shop and t.closed_at is null), '[]'::jsonb) else '[]'::jsonb end,
    'recent', case when v_mgr then coalesce((select jsonb_agg(x order by (x->>'closed_at') desc) from (
               select jsonb_build_object('id', t.id, 'name', coalesce(s.name, '(removed)'), 'note', t.note, 'created_at', t.created_at, 'closed_at', t.closed_at, 'summary', t.summary) as x
                 from receive_tasks t left join staff s on s.user_id = t.assigned_to and s.shop_id = t.shop_id
                where t.shop_id = v_shop and t.closed_at is not null order by t.closed_at desc limit 15) y), '[]'::jsonb) else '[]'::jsonb end,
    'team', case when v_mgr then coalesce((select jsonb_agg(jsonb_build_object('user_id', s.user_id, 'name', s.name, 'role', s.role) order by s.name)
               from staff s where s.shop_id = v_shop and s.active and s.role in ('technician', 'front_desk', 'manager')), '[]'::jsonb) else '[]'::jsonb end);
end $function$;

revoke all on function public.can_receive_stock() from public, anon;
revoke all on function public.receive_task_assign(uuid, text) from public, anon;
revoke all on function public.receive_task_close(uuid, jsonb) from public, anon;
revoke all on function public.receive_tasks_list() from public, anon;
grant execute on function public.can_receive_stock() to authenticated;
grant execute on function public.receive_task_assign(uuid, text) to authenticated;
grant execute on function public.receive_task_close(uuid, jsonb) to authenticated;
grant execute on function public.receive_tasks_list() to authenticated;

-- adding a NEW item: a technician / front desk needs an open delivery task
create or replace function public.inv_add_new(p_part jsonb, p_qty integer default 0)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_role text := public.current_staff_role();
  v_shop uuid := public.current_shop();
  v_name text := left(trim(coalesce(p_part->>'name', '')), 200);
  v_sku text := left(trim(coalesce(p_part->>'sku', '')), 80);
  v_qty int := greatest(coalesce(p_qty, 0), 0);
  v_id text; v_dup record; v_cost numeric := null; v_price int := null; v_low int := 0; v_rq int := 0;
begin
  if v_role is null or v_role not in ('owner', 'manager', 'front_desk', 'technician') then raise exception 'not staff'; end if;
  if not public.can_receive_stock() then raise exception 'Booking in new items has to be assigned to you by the owner or a manager first.'; end if;   -- 8z86
  if v_name = '' then raise exception 'Give the part a name.'; end if;
  if v_qty > 100000 then raise exception 'That quantity is too large.'; end if;
  if v_sku <> '' then
    select id, name into v_dup from inventory where shop_id = v_shop and deleted_at is null and lower(trim(sku)) = lower(v_sku) limit 1;
    if found then raise exception 'SKU % is already in stock as "%". Open that one and use Receive instead of adding it again.', v_sku, v_dup.name; end if;
  end if;
  if coalesce(p_part->>'cost', '') ~ '^[0-9]{1,7}(\.[0-9]{1,4})?$' then v_cost := (p_part->>'cost')::numeric; end if;
  if coalesce(p_part->>'sell_price_cents', '') ~ '^[0-9]{1,9}$' then v_price := (p_part->>'sell_price_cents')::int; end if;
  if coalesce(p_part->>'low_at', '') ~ '^[0-9]{1,6}$' then v_low := (p_part->>'low_at')::int; end if;
  if coalesce(p_part->>'reorder_qty', '') ~ '^[0-9]{1,6}$' then v_rq := (p_part->>'reorder_qty')::int; end if;
  v_id := 'new_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  insert into inventory(id, shop_id, name, sku, category, qty, low_at, reorder_qty, fitment, fcc_id, chip, grade, brand, vendor_sku, supplier, location, notes, link, cost, sell_price_cents)
  values (v_id, v_shop, v_name, v_sku,
          left(trim(coalesce(p_part->>'category', '')), 80), v_qty, v_low, v_rq,
          left(trim(coalesce(p_part->>'fitment', '')), 4000), upper(left(trim(coalesce(p_part->>'fcc_id', '')), 60)), left(trim(coalesce(p_part->>'chip', '')), 80),
          left(trim(coalesce(p_part->>'grade', '')), 40), left(trim(coalesce(p_part->>'brand', '')), 60), left(trim(coalesce(p_part->>'vendor_sku', '')), 80),
          left(trim(coalesce(p_part->>'supplier', '')), 80), left(trim(coalesce(p_part->>'location', '')), 80), left(trim(coalesce(p_part->>'notes', '')), 2000),
          nullif(left(trim(coalesce(p_part->>'link', '')), 500), ''), v_cost, v_price);
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (auth.uid(), v_role, 'inventory_add', 'inventory', v_id,
            jsonb_build_object('name', v_name, 'sku', v_sku, 'qty', v_qty, 'price_cents', v_price, 'cost', v_cost), v_shop);
  return jsonb_build_object('id', v_id, 'name', v_name, 'qty', v_qty, 'needs_price', v_price is null);
end $function$;

revoke all on function public.inv_add_new(jsonb, integer) from public, anon;
grant execute on function public.inv_add_new(jsonb, integer) to authenticated;

notify pgrst, 'reload schema';
