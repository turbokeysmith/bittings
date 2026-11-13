-- 8z105 (owner, 2026-11-13): "Jayden is at the shop computer right now … and it's telling him that he can't clock in
-- and that he needs to clock in at the shop computer."
--
-- What happened: "this is a shop computer" is a secret kept inside ONE browser on ONE computer (8d / 8z76). It had been
-- ticked in a different browser, so the browser the shop actually uses was never marked — and the only way to mark it
-- was for an owner / manager to sign in on that very computer. The owner works away from the shop, so the technician
-- was stuck.
--
-- This adds a way to mark a computer WITHOUT the owner being there:
--   1. anyone signed in as staff on that computer asks for it  → device_pair_start()  → a 6-digit code on the screen;
--   2. an owner / manager sees the request (who asked, which computer, the code) on their own phone and approves it
--      → device_pair_pending() / device_pair_approve();
--   3. the waiting computer collects its secret                 → device_pair_finish()  (once, by the same person).
-- Nothing is granted until an owner / manager approves. A request dies after 15 minutes. Everything is in the audit log.

create table if not exists public.shop_device_requests (
  id             uuid primary key default gen_random_uuid(),
  shop_id        uuid not null default public.current_shop() references public.shops(id) on delete cascade,
  code           text not null,
  name           text not null default 'Shop computer',
  requested_by   uuid not null default auth.uid(),
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null default now() + interval '15 minutes',
  approved_by    uuid,
  approved_at    timestamptz,
  consumed_at    timestamptz
);
alter table public.shop_device_requests enable row level security;   -- no policies: these functions are the only way in
revoke all on public.shop_device_requests from public, anon, authenticated;
create index if not exists shop_device_requests_shop_idx on public.shop_device_requests(shop_id, created_at desc);

-- 1) the computer asks
create or replace function public.device_pair_start(p_name text default 'Shop computer')
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare v_shop uuid := public.current_shop(); v_id uuid; v_code text; v_open int; v_exp timestamptz;
begin
  if public.current_staff_role() is null or v_shop is null then raise exception 'not staff'; end if;
  delete from shop_device_requests where shop_id = v_shop and (expires_at < now() - interval '1 day' or (requested_by = auth.uid() and consumed_at is null));
  select count(*) into v_open from shop_device_requests where shop_id = v_shop and consumed_at is null and expires_at > now();
  if v_open >= 5 then raise exception 'Too many computers are waiting for approval. Try again in a few minutes.' using errcode = 'P0001'; end if;
  v_code := lpad(((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
  insert into shop_device_requests(shop_id, code, name) values (v_shop, v_code, left(coalesce(nullif(trim(p_name), ''), 'Shop computer'), 80))
    returning id, expires_at into v_id, v_exp;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (auth.uid(), public.current_staff_role(), 'device_pair_requested', 'shop_device_requests', v_id::text, jsonb_build_object('name', p_name), v_shop);
  return jsonb_build_object('id', v_id, 'code', v_code, 'expires_at', v_exp);
end $function$;

-- 2) the owner / manager looks and approves
create or replace function public.device_pair_pending()
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select case when not public.is_manager() then '[]'::jsonb else coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'code', r.code, 'name', r.name, 'created_at', r.created_at,
             'who', coalesce((select s.name from staff s where s.user_id = r.requested_by and s.shop_id = r.shop_id limit 1), 'Someone on your team')) order by r.created_at desc)
      from shop_device_requests r
     where r.shop_id = public.current_shop() and r.approved_at is null and r.consumed_at is null and r.expires_at > now()), '[]'::jsonb) end;
$function$;

create or replace function public.device_pair_approve(p_id uuid, p_ok boolean default true)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_n int;
begin
  if not public.is_manager() then raise exception 'only a manager/owner can approve a shop computer'; end if;
  if coalesce(p_ok, true) then
    update shop_device_requests set approved_by = auth.uid(), approved_at = now()
     where id = p_id and shop_id = public.current_shop() and approved_at is null and consumed_at is null and expires_at > now();
  else
    delete from shop_device_requests where id = p_id and shop_id = public.current_shop() and consumed_at is null;
  end if;
  get diagnostics v_n = row_count;
  if v_n > 0 then
    insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
      values (auth.uid(), public.current_staff_role(), case when coalesce(p_ok, true) then 'device_pair_approved' else 'device_pair_refused' end, 'shop_device_requests', p_id::text, '{}'::jsonb, public.current_shop());
  end if;
  return jsonb_build_object('ok', v_n > 0);
end $function$;

-- 3) the waiting computer collects its secret (once; only the person who asked; only after approval)
create or replace function public.device_pair_finish(p_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare v_r public.shop_device_requests; v_token text; v_dev uuid;
begin
  if public.current_staff_role() is null then raise exception 'not staff'; end if;
  select * into v_r from shop_device_requests where id = p_id and shop_id = public.current_shop() and requested_by = auth.uid() for update;
  if not found then return jsonb_build_object('ok', false, 'state', 'gone'); end if;
  if v_r.consumed_at is not null then return jsonb_build_object('ok', false, 'state', 'gone'); end if;
  if v_r.expires_at < now() then return jsonb_build_object('ok', false, 'state', 'expired'); end if;
  if v_r.approved_at is null then return jsonb_build_object('ok', false, 'state', 'waiting'); end if;
  v_token := encode(gen_random_bytes(24), 'hex');
  insert into shop_devices(shop_id, name, token_hash, registered_by) values (v_r.shop_id, v_r.name, crypt(v_token, gen_salt('bf')), v_r.approved_by)
    returning id into v_dev;
  update shop_device_requests set consumed_at = now() where id = v_r.id;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (v_r.approved_by, 'manager', 'device_registered', 'shop_devices', v_dev::text,
            jsonb_build_object('name', v_r.name, 'by_approval', true, 'requested_by', v_r.requested_by), v_r.shop_id);
  return jsonb_build_object('ok', true, 'state', 'approved', 'id', v_dev, 'token', v_token);
end $function$;

revoke all on function public.device_pair_start(text) from public, anon;
revoke all on function public.device_pair_pending() from public, anon;
revoke all on function public.device_pair_approve(uuid, boolean) from public, anon;
revoke all on function public.device_pair_finish(uuid) from public, anon;
grant execute on function public.device_pair_start(text) to authenticated;
grant execute on function public.device_pair_pending() to authenticated;
grant execute on function public.device_pair_approve(uuid, boolean) to authenticated;
grant execute on function public.device_pair_finish(uuid) to authenticated;
