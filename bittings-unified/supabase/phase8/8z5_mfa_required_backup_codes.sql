-- ============================================================================
-- Phase 8z5 (2026-11-09) — two-factor REQUIRED for managers/owners + one-time backup codes
-- ----------------------------------------------------------------------------
-- Owner request: "for forgot password we need a way to do 2FA" → approved plan:
--   (2c) owners & managers MUST use an authenticator app. 8e only enforced the code for people
--        who had chosen to set one up; now a manager/owner session has NO manager powers unless
--        it is aal2 (passed the 6-digit code). The app sends anyone without an authenticator to
--        the setup screen first, so the only way in is to set one up.
--   (2d) 10 one-time backup codes per person, shown once at setup. A lost phone → sign in with
--        the password + one backup code → the mfa-recover edge function removes the old
--        authenticator → set up the new phone (and get fresh codes). Codes are stored as SHA-256
--        hashes only; nobody (not even the owner) can read them back.
-- Rollback: see the bottom of this file.
-- ============================================================================

-- (2c) aal_ok(): a session counts only when it passed the code (aal2). auth.uid() IS NULL =
-- service-role / server context, which never had manager powers through these checks anyway.
create or replace function public.aal_ok()
returns boolean language sql stable security definer set search_path to 'public', 'auth' as $function$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'aal', 'aal1') = 'aal2'
      or auth.uid() is null
$function$;
revoke execute on function public.aal_ok() from public, anon;
grant  execute on function public.aal_ok() to authenticated, service_role;

-- Does the CALLER still owe 2FA this session? Now also TRUE for a manager/owner with no
-- authenticator yet (they must set one up). The app's boot check sends them to signin.html.
create or replace function public.mfa_pending()
returns boolean language sql stable security definer set search_path to 'public', 'auth' as $function$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'aal', 'aal1') <> 'aal2'
     and ( exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
           or public.current_staff_role() in ('manager','owner') )
$function$;
revoke execute on function public.mfa_pending() from public, anon;
grant  execute on function public.mfa_pending() to authenticated;

-- (2d) backup codes ----------------------------------------------------------------------------
create table if not exists public.mfa_backup_codes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  code_hash  text not null,                 -- sha256 hex of the normalised code (no dash, upper case)
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists mfa_backup_codes_user on public.mfa_backup_codes(user_id);
alter table public.mfa_backup_codes enable row level security;   -- no policies: only the functions below / service role
revoke all on public.mfa_backup_codes from anon, authenticated;

-- failed backup-code attempts (rate limit for mfa-recover: 5 per hour per person)
create table if not exists public.mfa_recover_attempts (
  id      bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ok      boolean not null,
  at      timestamptz not null default now()
);
create index if not exists mfa_recover_attempts_user on public.mfa_recover_attempts(user_id, at);
alter table public.mfa_recover_attempts enable row level security;
revoke all on public.mfa_recover_attempts from anon, authenticated;

-- New set of 10 codes for the CALLER (replaces any old set). Only on an aal2 session — i.e. right
-- after they proved the authenticator — so a stolen password alone can't mint codes.
-- Returns the plain codes ONCE (format ABCD-EFGH, 32-letter alphabet without 0/O/1/I).
create or replace function public.mfa_backup_codes_new()
returns text[] language plpgsql volatile security definer set search_path to 'public', 'extensions' as $function$
declare
  alpha constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out_codes text[] := '{}';
  b bytea; c text; i int; j int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'aal', 'aal1') <> 'aal2' then
    raise exception 'enter your authenticator code first';
  end if;
  delete from public.mfa_backup_codes where user_id = auth.uid();
  for i in 1..10 loop
    b := extensions.gen_random_bytes(8); c := '';
    for j in 0..7 loop c := c || substr(alpha, (get_byte(b, j) % 32) + 1, 1); end loop;
    insert into public.mfa_backup_codes(user_id, code_hash) values (auth.uid(), encode(extensions.digest(c, 'sha256'), 'hex'));
    out_codes := out_codes || (substr(c, 1, 4) || '-' || substr(c, 5, 4));
  end loop;
  return out_codes;
end $function$;
revoke execute on function public.mfa_backup_codes_new() from public, anon;
grant  execute on function public.mfa_backup_codes_new() to authenticated;

-- How many unused codes the CALLER has left (Settings shows "7 backup codes left").
create or replace function public.mfa_backup_codes_left()
returns int language sql stable security definer set search_path to 'public' as $function$
  select count(*)::int from public.mfa_backup_codes where user_id = auth.uid() and used_at is null
$function$;
revoke execute on function public.mfa_backup_codes_left() from public, anon;
grant  execute on function public.mfa_backup_codes_left() to authenticated;

-- Team card: who in MY shop has finished setting up their login (invite accepted = has signed in).
-- Drives the "⏳ invite sent · Resend invite" tag. Managers only; no emails or secrets exposed.
create or replace function public.staff_login_status()
returns table(user_id uuid, signed_in boolean) language sql stable security definer set search_path to 'public', 'auth' as $function$
  select s.user_id, (u.last_sign_in_at is not null) as signed_in
    from public.staff s join auth.users u on u.id = s.user_id
   where s.shop_id = public.current_shop() and public.is_manager()
$function$;
revoke execute on function public.staff_login_status() from public, anon;
grant  execute on function public.staff_login_status() to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Rollback (restores 8e behaviour; keeps the tables):
--   create or replace function public.aal_ok() returns boolean language sql stable security definer
--     set search_path to 'public','auth' as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'aal','aal1') = 'aal2'
--     or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified') $$;
--   create or replace function public.mfa_pending() returns boolean language sql stable security definer
--     set search_path to 'public','auth' as $$ select exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
--     and coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'aal','aal1') <> 'aal2' $$;
