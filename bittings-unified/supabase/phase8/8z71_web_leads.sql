-- ============================================================================
-- 8z71 — WEBSITE LEADS (owner, 2026-11-12).
-- ----------------------------------------------------------------------------
-- The public website's contact form only e-mailed the shop; nothing reached the
-- app. Leads now land in their own table and show in the app under "Leads",
-- where staff can book them (Scheduler), quote them, or dismiss them.
--
--   • web_leads: one row per enquiry, fenced to the shop like every other table.
--   • submit_web_lead(...): the ONLY way in for the public website (anon). It
--     checks the shop exists, trims every field to a sane length, needs a name
--     and a phone or e-mail, ignores an exact repeat inside 10 minutes and stops
--     accepting after 40 leads in an hour for one shop (a flood, not customers).
--     It always answers true, so a bot learns nothing.
--   • Staff read and update (status); owner/manager delete.
-- Additive only: no existing table, policy or function is changed.
-- ============================================================================

create table if not exists public.web_leads (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops(id) on delete cascade,
  name        text not null default '',
  phone       text not null default '',
  email       text not null default '',
  address     text not null default '',
  service     text not null default '',
  notes       text not null default '',
  lang        text not null default '',
  page        text not null default '',
  source      text not null default 'website',
  status      text not null default 'new' check (status in ('new','scheduled','quoted','dismissed')),
  handled_by  uuid,
  handled_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists web_leads_shop_idx on public.web_leads(shop_id, created_at desc);

alter table public.web_leads enable row level security;
drop policy if exists web_leads_tenant on public.web_leads;
create policy web_leads_tenant on public.web_leads as restrictive for all to authenticated
  using (shop_id = public.current_shop()) with check (shop_id = public.current_shop());
drop policy if exists web_leads_select on public.web_leads;
create policy web_leads_select on public.web_leads for select to authenticated using (public.is_staff());
drop policy if exists web_leads_update on public.web_leads;
create policy web_leads_update on public.web_leads for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists web_leads_delete on public.web_leads;
create policy web_leads_delete on public.web_leads for delete to authenticated using (public.is_manager());

revoke all on public.web_leads from anon, public;
grant select, update, delete on public.web_leads to authenticated;
grant select, insert, update, delete on public.web_leads to service_role;

-- the public way in
create or replace function public.submit_web_lead(
  p_shop uuid, p_name text, p_phone text default '', p_email text default '', p_address text default '',
  p_service text default '', p_notes text default '', p_lang text default '', p_page text default '')
returns boolean language plpgsql security definer set search_path to 'public' as $function$
declare
  v_name  text := left(btrim(coalesce(p_name,'')), 120);
  v_phone text := left(btrim(coalesce(p_phone,'')), 40);
  v_email text := left(btrim(coalesce(p_email,'')), 160);
  v_svc   text := left(btrim(coalesce(p_service,'')), 120);
begin
  if p_shop is null or not exists (select 1 from shops where id = p_shop) then return true; end if;
  if v_name = '' or (v_phone = '' and v_email = '') then return true; end if;
  -- a flood is not customers: stop taking them for this shop until the hour rolls over
  if (select count(*) from web_leads where shop_id = p_shop and created_at > now() - interval '1 hour') >= 40 then return true; end if;
  -- the same person pressing Send twice
  if exists (select 1 from web_leads where shop_id = p_shop and created_at > now() - interval '10 minutes'
               and name = v_name and phone = v_phone and email = v_email and service = v_svc) then return true; end if;
  insert into web_leads(shop_id, name, phone, email, address, service, notes, lang, page)
  values (p_shop, v_name, v_phone, v_email, left(btrim(coalesce(p_address,'')), 240), v_svc,
          left(btrim(coalesce(p_notes,'')), 2000), left(btrim(coalesce(p_lang,'')), 8), left(btrim(coalesce(p_page,'')), 200));
  return true;
end $function$;
revoke execute on function public.submit_web_lead(uuid, text, text, text, text, text, text, text, text) from public;
grant  execute on function public.submit_web_lead(uuid, text, text, text, text, text, text, text, text) to anon, authenticated;
comment on function public.submit_web_lead(uuid, text, text, text, text, text, text, text, text) is
  '8z71: the public website contact form. Inserts one web_leads row for the given shop; rate-limited; always returns true.';
