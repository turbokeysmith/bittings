-- ============================================================================
-- Phase 8e — authenticator-app two-factor (TOTP) for managers/owners, enforced in the database
-- ----------------------------------------------------------------------------
-- Owner request 2026-11-07: "add Google Authenticator for managers when they login from a new
-- device." Supabase Auth already supports TOTP MFA (enroll → QR → verify). A session that passed
-- the code carries the JWT claim aal = 'aal2'; a fresh password-only session is 'aal1'. Sessions
-- persist per device, so the code is only asked on a device that has to log in again — exactly
-- the "new device" feel.
--
-- Enforcement is here, not only in the UI:
--   aal_ok() = TRUE when the caller has NO verified factor (nothing to enforce yet)
--              or when the session is aal2 (they passed the code this session).
--   is_manager() / is_owner() now require aal_ok(). An enrolled manager on an aal1 session has
--   NO manager powers anywhere (every RLS policy and definer RPC that uses these) until they
--   enter the code. Staff/technician checks (is_staff, current_staff_role) are unchanged.
--   staff_mfa_status() lets managers see who has 2FA on (for the Team card); resetting a lost
--   phone is an owner-only edge function (mfa-reset) using the admin API.
-- Apply: supabase db query --file … --linked --yes
-- ============================================================================

create or replace function public.aal_ok()
returns boolean language sql stable security definer set search_path to 'public', 'auth' as $function$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
$function$;
revoke execute on function public.aal_ok() from public, anon;
grant  execute on function public.aal_ok() to authenticated, service_role;

create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select public.current_staff_role() in ('manager','owner') and public.aal_ok()
$function$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select public.current_staff_role() = 'owner' and public.aal_ok()
$function$;

-- Does the CALLER still owe a code this session? (UI boot check; cheaper than listing factors.)
create or replace function public.mfa_pending()
returns boolean language sql stable security definer set search_path to 'public', 'auth' as $function$
  select exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
     and coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'aal', 'aal1') <> 'aal2'
$function$;
revoke execute on function public.mfa_pending() from public, anon;
grant  execute on function public.mfa_pending() to authenticated;

-- Team card: who in MY shop has a verified authenticator (managers only; no secrets exposed).
create or replace function public.staff_mfa_status()
returns table(user_id uuid, has_mfa boolean, factors int) language sql stable security definer set search_path to 'public', 'auth' as $function$
  select s.user_id,
         exists (select 1 from auth.mfa_factors f where f.user_id = s.user_id and f.status = 'verified') as has_mfa,
         (select count(*)::int from auth.mfa_factors f where f.user_id = s.user_id and f.status = 'verified') as factors
    from public.staff s
   where s.shop_id = public.current_shop() and public.is_manager()
$function$;
revoke execute on function public.staff_mfa_status() from public, anon;
grant  execute on function public.staff_mfa_status() to authenticated;
