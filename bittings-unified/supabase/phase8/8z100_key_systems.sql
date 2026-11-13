-- 8z100 (owner, 2026-11-13): residential / commercial "key systems" — master key systems saved under a customer.
-- Owner: "a key can be tied to the person, the office, the janitor — whatever it is — separate person from physical
-- office so you can fill in whichever one you want, or both." Plan: docs/RESCOM_PLAN.md. Math: app/keycalc.js.
--
-- A key system is effectively the keys to a building, so:
--   * nobody reads or writes the table directly — not even the owner: every read and write goes through the functions
--     below, which allow OWNERS and MANAGERS only (technicians and front desk get nothing yet);
--   * every open of a system ("view"), every save, print, issue / return / lost entry and delete is written to
--     key_system_events with who and when; the events can be read but never changed;
--   * delete = a stamp (deleted_at); the row and its history stay.
-- The whole system (top master, keys, doors, who holds what, settings) is one jsonb document — the app edits it as a
-- unit, like a receipt. Size-capped so a bad save cannot bloat the database.

create table if not exists public.key_systems (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null default public.current_shop() references public.shops(id) on delete cascade,
  name          text not null,
  site          text not null default '',
  customer_id   text,
  customer_name text not null default '',
  spec          text not null check (spec in ('sc', 'a2', 's6300')),
  pins          integer not null check (pins between 4 and 8),
  data          jsonb not null default '{}'::jsonb,
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_by    uuid,
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  deleted_by    uuid,
  constraint key_systems_sizes check (length(name) between 1 and 120 and length(site) <= 120 and length(customer_name) <= 160
                                      and coalesce(length(customer_id), 0) <= 120 and pg_column_size(data) < 600000)
);
create index if not exists key_systems_shop_idx on public.key_systems (shop_id, updated_at desc) where deleted_at is null;

create table if not exists public.key_system_events (
  id         bigint generated always as identity primary key,
  shop_id    uuid not null default public.current_shop() references public.shops(id) on delete cascade,
  system_id  uuid not null references public.key_systems(id) on delete cascade,
  kind       text not null check (kind in ('create', 'view', 'save', 'print', 'issue', 'return', 'lost', 'rekey', 'export', 'delete', 'note')),
  detail     jsonb not null default '{}'::jsonb,
  user_id    uuid default auth.uid(),
  user_role  text default public.current_staff_role(),
  at         timestamptz not null default now(),
  constraint key_system_events_size check (pg_column_size(detail) < 8000)
);
create index if not exists key_system_events_sys_idx on public.key_system_events (system_id, at desc);

alter table public.key_systems enable row level security;
alter table public.key_system_events enable row level security;
-- no policies for authenticated users = no direct access; the security-definer functions below are the only door
revoke all on public.key_systems, public.key_system_events from anon, public, authenticated;
grant all on public.key_systems, public.key_system_events to service_role;

create or replace function public.key_system__guard()
returns void language plpgsql stable security definer set search_path to 'public' as $function$
begin
  if public.current_shop() is null then raise exception 'not signed in to a shop'; end if;
  if not public.is_manager() then raise exception 'key systems are for owners and managers only'; end if;
end $function$;
revoke all on function public.key_system__guard() from public, anon, authenticated;

-- the list: names and counts only — no cuts, no holders (so the list itself is not logged)
create or replace function public.key_system_list()
returns table (id uuid, name text, site text, customer_id text, customer_name text, spec text, pins integer,
               n_keys integer, n_doors integer, updated_at timestamptz)
language plpgsql stable security definer set search_path to 'public' as $function$
begin
  perform public.key_system__guard();
  return query
    select k.id, k.name, k.site, k.customer_id, k.customer_name, k.spec, k.pins,
           coalesce(jsonb_array_length(case when jsonb_typeof(k.data->'keys') = 'array' then k.data->'keys' end), 0),
           coalesce(jsonb_array_length(case when jsonb_typeof(k.data->'doors') = 'array' then k.data->'doors' end), 0),
           k.updated_at
      from key_systems k
     where k.shop_id = public.current_shop() and k.deleted_at is null
     order by k.updated_at desc;
end $function$;

-- open one system: the whole document — and a "view" event
create or replace function public.key_system_get(p_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v key_systems%rowtype;
begin
  perform public.key_system__guard();
  select * into v from key_systems where id = p_id and shop_id = public.current_shop() and deleted_at is null;
  if not found then raise exception 'key system not found'; end if;
  insert into key_system_events(system_id, kind) values (p_id, 'view');
  return jsonb_build_object('id', v.id, 'name', v.name, 'site', v.site, 'customer_id', v.customer_id, 'customer_name', v.customer_name,
    'spec', v.spec, 'pins', v.pins, 'data', v.data, 'created_at', v.created_at, 'updated_at', v.updated_at);
end $function$;

-- create (p_id null) or save (p_id given). p_sys = { name, site, customer_id, customer_name, spec, pins, data }
create or replace function public.key_system_save(p_id uuid, p_sys jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_id uuid; v_n int; v_data jsonb := coalesce(p_sys->'data', '{}'::jsonb);
begin
  perform public.key_system__guard();
  if jsonb_typeof(v_data) <> 'object' then raise exception 'data must be an object'; end if;
  if p_id is null then
    insert into key_systems(name, site, customer_id, customer_name, spec, pins, data, updated_by)
    values (trim(p_sys->>'name'), coalesce(trim(p_sys->>'site'), ''), nullif(trim(coalesce(p_sys->>'customer_id', '')), ''),
            coalesce(trim(p_sys->>'customer_name'), ''), p_sys->>'spec', (p_sys->>'pins')::int, v_data, auth.uid())
    returning id into v_id;
    insert into key_system_events(system_id, kind, detail) values (v_id, 'create', jsonb_build_object('name', p_sys->>'name', 'spec', p_sys->>'spec'));
  else
    update key_systems set name = trim(p_sys->>'name'), site = coalesce(trim(p_sys->>'site'), ''),
           customer_id = nullif(trim(coalesce(p_sys->>'customer_id', '')), ''), customer_name = coalesce(trim(p_sys->>'customer_name'), ''),
           spec = p_sys->>'spec', pins = (p_sys->>'pins')::int, data = v_data, updated_by = auth.uid(), updated_at = now()
     where id = p_id and shop_id = public.current_shop() and deleted_at is null;
    get diagnostics v_n = row_count;
    if v_n = 0 then raise exception 'key system not found'; end if;
    v_id := p_id;
    insert into key_system_events(system_id, kind, detail) values (v_id, 'save', jsonb_build_object(
      'keys', coalesce(jsonb_array_length(case when jsonb_typeof(v_data->'keys') = 'array' then v_data->'keys' end), 0),
      'doors', coalesce(jsonb_array_length(case when jsonb_typeof(v_data->'doors') = 'array' then v_data->'doors' end), 0)));
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $function$;

-- issue / return / lost / rekey / print / export / note — the history
create or replace function public.key_system_event(p_id uuid, p_kind text, p_detail jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
begin
  perform public.key_system__guard();
  if p_kind not in ('print', 'issue', 'return', 'lost', 'rekey', 'export', 'note') then raise exception 'unknown event'; end if;
  if not exists (select 1 from key_systems where id = p_id and shop_id = public.current_shop() and deleted_at is null) then raise exception 'key system not found'; end if;
  insert into key_system_events(system_id, kind, detail) values (p_id, p_kind, coalesce(p_detail, '{}'::jsonb));
  return jsonb_build_object('ok', true);
end $function$;

create or replace function public.key_system_history(p_id uuid, p_limit integer default 100)
returns table (at timestamptz, kind text, detail jsonb, who text, role text)
language plpgsql stable security definer set search_path to 'public' as $function$
begin
  perform public.key_system__guard();
  return query
    select e.at, e.kind, e.detail, coalesce(s.name, ''), coalesce(e.user_role, '')
      from key_system_events e left join staff s on s.user_id = e.user_id and s.shop_id = e.shop_id
     where e.system_id = p_id and e.shop_id = public.current_shop()
     order by e.at desc limit greatest(1, least(coalesce(p_limit, 100), 500));
end $function$;

create or replace function public.key_system_delete(p_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_n int;
begin
  perform public.key_system__guard();
  update key_systems set deleted_at = now(), deleted_by = auth.uid() where id = p_id and shop_id = public.current_shop() and deleted_at is null;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'key system not found'; end if;
  insert into key_system_events(system_id, kind) values (p_id, 'delete');
  return jsonb_build_object('ok', true);
end $function$;

revoke all on function public.key_system_list(), public.key_system_get(uuid), public.key_system_save(uuid, jsonb),
  public.key_system_event(uuid, text, jsonb), public.key_system_history(uuid, integer), public.key_system_delete(uuid) from public, anon;
grant execute on function public.key_system_list(), public.key_system_get(uuid), public.key_system_save(uuid, jsonb),
  public.key_system_event(uuid, text, jsonb), public.key_system_history(uuid, integer), public.key_system_delete(uuid) to authenticated;

notify pgrst, 'reload schema';
