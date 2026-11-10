-- ============================================================================
-- Phase 8z6 (2026-11-09) — teammate contact info filled in on invite
-- ----------------------------------------------------------------------------
-- Owner: "have them fill in their name and address along with phone number". A new teammate
-- who opens the invite link enters full name, phone and home address on the "Create your
-- password" screen. Phone/address are PRIVATE: not in the column-level select grant on staff
-- (1a), so coworkers can't read them; the person edits their own via update_my_profile(), and
-- managers/owners read the team's via staff_contacts().
-- Rollback: drop function update_my_profile, my_profile, staff_contacts; alter table staff drop column phone, drop column address;
-- ============================================================================
alter table public.staff add column if not exists phone   text;
alter table public.staff add column if not exists address text;

-- the CALLER updates their own name / phone / address (nothing else — not role, not active)
create or replace function public.update_my_profile(p_name text, p_phone text, p_address text)
returns void language plpgsql volatile security definer set search_path to 'public' as $function$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update public.staff
     set name    = coalesce(nullif(btrim(p_name), ''), name),
         phone   = nullif(btrim(p_phone), ''),
         address = nullif(btrim(p_address), ''),
         updated_at = now()
   where user_id = auth.uid();
end $function$;
revoke execute on function public.update_my_profile(text, text, text) from public, anon;
grant  execute on function public.update_my_profile(text, text, text) to authenticated;

-- the CALLER's own profile (prefills the form)
create or replace function public.my_profile()
returns table(name text, phone text, address text) language sql stable security definer set search_path to 'public' as $function$
  select s.name, s.phone, s.address from public.staff s where s.user_id = auth.uid()
$function$;
revoke execute on function public.my_profile() from public, anon;
grant  execute on function public.my_profile() to authenticated;

-- managers/owners: the team's contact info (their own shop only)
create or replace function public.staff_contacts()
returns table(user_id uuid, phone text, address text, email text) language sql stable security definer set search_path to 'public', 'auth' as $function$
  select s.user_id, s.phone, s.address, u.email::text
    from public.staff s join auth.users u on u.id = s.user_id
   where s.shop_id = public.current_shop() and public.is_manager()
$function$;
revoke execute on function public.staff_contacts() from public, anon;
grant  execute on function public.staff_contacts() to authenticated;
